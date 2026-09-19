import { forwardToAiService } from "@/lib/aiService";

export async function POST(request: Request) {
  return forwardToAiService("/api/carousel-builder/generate", {
    method: "POST",
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
  });
}
