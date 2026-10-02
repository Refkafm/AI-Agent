import { checkOpenAI, modelFor } from "../../../lib/server/openai.ts";
import { guardLocal } from "../../../lib/server/http.ts";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    guardLocal(request);
  } catch {
    return Response.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const status = await checkOpenAI();
  return Response.json(
    {
      ...status,
      models: Object.fromEntries(
        ["astra", "alpha", "rodeo", "delta"].map((a) => [a, modelFor(a)]),
      ),
      knowledgeBase: { connected: false, documents: 0 },
      graphify: {
        endpoint:
          process.env.GRAPHIFY_MCP_URL || "https://api.graphify.com/mcp",
        verified: false,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
