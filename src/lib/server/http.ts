/** This application is deliberately local-only, not a public authenticated service. */
export function guardLocal(request: Request) {
  const incoming = new URL(request.url);
  const url = new URL(
    `${incoming.protocol}//${request.headers.get("host") || incoming.host}`,
  );
  if (url.username || url.password) throw new Error("Host tidak valid.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Akses hanya melalui localhost.");
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    throw new Error("Origin tidak diizinkan.");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Error("Permintaan lintas situs ditolak.");
  if (request.method === "POST" && origin !== url.origin)
    throw new Error("Origin same-origin diperlukan.");
}
export async function readBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("Gunakan application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Body kosong.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 32000) throw new Error("Permintaan terlalu besar.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!data || Array.isArray(data) || typeof data !== "object")
    throw new Error("Body tidak valid.");
  return data;
}
