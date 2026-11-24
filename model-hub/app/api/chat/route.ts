import { requireIdentity } from "../../../cursor/identity";
import { runChat, type ChatMessage } from "../../../lib/chat";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;

  let body: { model?: string; messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON body required" }, { status: 400 });
  }

  try {
    const result = await runChat({
      model: String(body.model || ""),
      messages: Array.isArray(body.messages) ? body.messages : [],
    });
    return Response.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
