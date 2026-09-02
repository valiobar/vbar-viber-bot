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

export type ExtractedFile = { text: string; fileType: "pdf" | "md" | "txt" };
export type FetchedUrl = { text: string; fileType: "html" | "txt"; title?: string };

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
