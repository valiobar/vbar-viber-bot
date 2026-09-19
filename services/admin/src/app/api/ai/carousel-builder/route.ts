import { forwardToAiService } from "@/lib/aiService";
import { withAvailableSteps } from "@/lib/aiBuilderContext";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  return forwardToAiService("/api/carousel-builder/generate", {
    method: "POST",
    body: JSON.stringify(await withAvailableSteps(body)),
    headers: { "Content-Type": "application/json" },
  });
}
