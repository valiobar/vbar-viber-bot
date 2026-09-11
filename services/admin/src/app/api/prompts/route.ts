import { forwardToAiService } from "@/lib/aiService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskType = searchParams.get("taskType");
  const query = taskType ? `?taskType=${encodeURIComponent(taskType)}` : "";
  return forwardToAiService(`/api/prompts${query}`, { method: "GET" });
}

export async function POST(request: Request) {
  return forwardToAiService("/api/prompts", {
    method: "POST",
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
  });
}
