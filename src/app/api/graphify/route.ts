import { GraphifyClient } from "../../../lib/server/graphify.ts";
import { guardLocal, readBody } from "../../../lib/server/http.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    guardLocal(request);
  } catch {
    return Response.json({ error: "Akses ditolak." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await readBody(request);
  } catch {
    return Response.json({ error: "Body tidak valid." }, { status: 400 });
  }
  let client: GraphifyClient | undefined;
  try {
    client = new GraphifyClient();
    if (body.action === "list")
      return Response.json({
        connected: true,
        tools: await client.listTools(),
        checkedAt: new Date().toISOString(),
      });
    if (
      body.action === "call" &&
      body.approved === true &&
      typeof body.name === "string" &&
      body.arguments &&
      typeof body.arguments === "object" &&
      !Array.isArray(body.arguments)
    )
      return Response.json({
        result: await client.call(
          body.name,
          body.arguments as Record<string, unknown>,
        ),
        verifiedAt: new Date().toISOString(),
      });
    return Response.json(
      { error: "Pilih tool dan konfirmasi argumen sebelum menjalankan." },
      { status: 400 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Graphify gagal.",
        connected: false,
      },
      { status: 502 },
    );
  } finally {
    await client?.close();
  }
}
