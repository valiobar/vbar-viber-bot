import { forwardToAiService } from "@/lib/aiService";

type IdParams = { params: { id: string } };

export async function DELETE(_request: Request, { params }: IdParams) {
  return forwardToAiService(
    `/api/knowledge-base/sources/${encodeURIComponent(params.id)}`,
    { method: "DELETE" }
  );
}
