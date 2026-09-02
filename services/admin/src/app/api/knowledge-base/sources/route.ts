import { forwardToAiService } from "@/lib/aiService";

export async function GET() {
  return forwardToAiService("/api/knowledge-base/sources", { method: "GET" });
}

export async function DELETE() {
  return forwardToAiService("/api/knowledge-base/sources", { method: "DELETE" });
}
