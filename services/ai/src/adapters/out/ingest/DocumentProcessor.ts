/**
 * Document Processor
 *
 * Extracts text from uploaded files and fetched URLs, then splits it into
 * overlapping chunks for vector-store ingest.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as cheerio from "cheerio";
import pdfParse from "pdf-parse";
import { Logger } from "@vbar/shared";
import ExcelJS from "exceljs";

export type ExtractedFile = { text: string; fileType: "pdf" | "md" | "txt" };
export type FetchedUrl = { text: string; fileType: "html" | "txt"; title?: string };

const ADDRESS_HEADER_KEYWORDS = ["адрес", "address", "местоположение", "локация", "location"];
const NAME_HEADER_KEYWORDS = ["име", "назв", "name", "обект"];

const mapsLink = (destination: string): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

const findColumn = (headers: string[], keywords: string[]): number | null => {
  const index = headers.findIndex((header) =>
    keywords.some((keyword) => header.toLowerCase().includes(keyword))
  );
  return index === -1 ? null : index;
};

/**
 * Output adapter wrapping pdf-parse, cheerio, and RecursiveCharacterTextSplitter.
 */
export class DocumentProcessor {
  constructor(private readonly logger: Logger) {}

  /**
   * Extract UTF-8 text from an uploaded file buffer.
   * Supported: PDF, Markdown, and plain text.
   */
  async extractFromFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ExtractedFile> {
    const ext = filename.toLowerCase().split(".").pop() ?? "";
    this.logger.debug("Extracting text from file", { filename, mimeType, ext });

    if (ext === "pdf" || mimeType === "application/pdf") {
      const { text } = await pdfParse(buffer);
      if (!text.trim()) {
        throw new Error("No extractable text (image-only or protected PDF?)");
      }
      return { text, fileType: "pdf" };
    }
    if (ext === "md") {
      return { text: buffer.toString("utf-8"), fileType: "md" };
    }
    if (ext === "txt" || mimeType.startsWith("text/")) {
      return { text: buffer.toString("utf-8"), fileType: "txt" };
    }
    throw new Error(
      `Unsupported file type: ${filename} (${mimeType}). Supported: .pdf, .md, .txt`
    );
  }

  /**
   * Fetch an http(s) URL and extract text from HTML, plain text, or markdown.
   * PDF-at-URL is out of scope.
   */
  async fetchUrl(url: string, timeoutMs: number): Promise<FetchedUrl> {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }

    this.logger.debug("Fetching URL for ingest", { url, timeoutMs });
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      const $ = cheerio.load(await response.text());
      $("script, style, nav, footer, noscript, svg").remove();
      const text = $("body").text().replace(/\s+/g, " ").trim();
      if (!text) throw new Error("No extractable text at URL");
      return { text, fileType: "html", title: $("title").text().trim() || undefined };
    }
    if (contentType.includes("text/plain") || contentType.includes("text/markdown")) {
      const text = (await response.text()).trim();
      if (!text) throw new Error("No extractable text at URL");
      return { text, fileType: "txt" };
    }
    throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
  }

  /**
   * Parse an .xlsx workbook into one self-contained chunk per data row.
   * The first non-empty row of each sheet is treated as the header and its
   * labels are inlined into every row chunk. Rows with an address-like
   * column get a precomputed Google Maps directions URL appended.
   */
  async extractRowsFromXlsx(buffer: Buffer): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    // exceljs types Buffer as ArrayBuffer; Node Buffer is compatible at runtime
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const chunks: string[] = [];
    workbook.eachSheet((sheet) => {
      let headers: string[] | null = null;
      let addressCol: number | null = null;
      let nameCol: number | null = null;

      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        // row.values is 1-based; normalize to trimmed strings
        const cells = (row.values as unknown[])
          .slice(1)
          .map((v) => (v == null ? "" : String(v).trim()));
        if (!cells.some(Boolean)) return;

        if (headers === null) {
          headers = cells;
          addressCol = findColumn(headers, ADDRESS_HEADER_KEYWORDS);
          nameCol = findColumn(headers, NAME_HEADER_KEYWORDS);
          return;
        }

        const pairs = headers
          .map((header, i) => ({ header, value: cells[i] ?? "" }))
          .filter(({ header, value }) => header && value)
          .map(({ header, value }) => `${header}: ${value}`);
        if (pairs.length === 0) return;

        let text = `Лист "${sheet.name}", ред ${rowNumber} — ${pairs.join(" | ")}`;
        if (addressCol !== null && cells[addressCol]) {
          const destination =
            nameCol !== null && cells[nameCol]
              ? `${cells[nameCol]}, ${cells[addressCol]}`
              : cells[addressCol];
          text += `\nGoogle Maps посока: ${mapsLink(destination)}`;
        }
        chunks.push(text);
      });
    });

    if (chunks.length === 0) {
      throw new Error("No extractable rows in spreadsheet (header-only or empty?)");
    }
    this.logger.debug("Extracted spreadsheet rows", { rows: chunks.length });
    return chunks;
  }

  /**
   * Split extracted text into overlapping chunks, dropping whitespace-only pieces.
   */
  async chunk(
    text: string,
    config: { chunkSize: number; chunkOverlap: number }
  ): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    });
    const chunks = await splitter.splitText(text);
    return chunks.filter((chunk) => chunk.trim().length > 0);
  }
}
