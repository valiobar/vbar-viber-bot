import { forwardToAiService } from "@/lib/aiService";

export async function POST(request: Request) {
  const formData = await request.formData();
  return forwardToAiService("/api/knowledge-base/files", {
    method: "POST",
    body: formData,
  });
}
