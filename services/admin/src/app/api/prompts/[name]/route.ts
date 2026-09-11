import { forwardToAiService } from "@/lib/aiService";

type NameParams = { params: { name: string } };
const path = (name: string) => `/api/prompts/${encodeURIComponent(name)}`;

export async function GET(_request: Request, { params }: NameParams) {
  return forwardToAiService(path(params.name), { method: "GET" });
}

export async function PUT(request: Request, { params }: NameParams) {
  return forwardToAiService(path(params.name), {
    method: "PUT",
    body: JSON.stringify(await request.json()),
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(_request: Request, { params }: NameParams) {
  return forwardToAiService(path(params.name), { method: "DELETE" });
}
