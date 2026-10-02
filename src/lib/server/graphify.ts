export type MCPTool = {
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};
export class GraphifyClient {
  private session: string | undefined;
  private version = "2025-03-26";
  private sequence = 0;
  private url: string;
  private token: string;
  private fetcher: typeof fetch;
  constructor(
    url = process.env.GRAPHIFY_MCP_URL || "https://api.graphify.com/mcp",
    token = process.env.GRAPHIFY_MCP_TOKEN || "",
    fetcher: typeof fetch = fetch,
  ) {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password)
      throw new Error("Graphify memerlukan URL HTTPS tanpa kredensial di URL.");
    this.url = url;
    this.token = token;
    this.fetcher = fetcher;
  }
  private headers() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": this.version,
      ...(this.session ? { "Mcp-Session-Id": this.session } : {}),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }
  async rpc(
    method: string,
    params?: unknown,
    notification = false,
  ): Promise<any> {
    const id = ++this.sequence;
    let response: Response;
    try {
      response = await this.fetcher(this.url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          jsonrpc: "2.0",
          ...(notification ? {} : { id }),
          method,
          ...(params ? { params } : {}),
        }),
        signal: AbortSignal.timeout(25000),
        redirect: "error",
      });
    } catch {
      throw new Error("Graphify tidak dapat dijangkau / timeout.");
    }
    if (!response.ok)
      throw new Error(
        `Graphify HTTP ${response.status}; periksa endpoint dan token.`,
      );
    this.session = response.headers.get("mcp-session-id") ?? this.session;
    if (notification) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Respons MCP kosong.");
    const decoder = new TextDecoder();
    let buffer = "",
      total = 0;
    const sse = response.headers
      .get("content-type")
      ?.includes("text/event-stream");
    const unwrap = (data: any) => {
      if (data.id !== id) return undefined;
      if (data.error)
        throw new Error(`Graphify JSON-RPC error ${data.error.code}.`);
      if (!("result" in data)) throw new Error("Respons MCP tidak valid.");
      return data.result;
    };
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 1_000_000)
          throw new Error("Respons Graphify terlalu besar.");
        buffer += decoder.decode(value, { stream: true });
        if (sse) {
          buffer = buffer.replace(/\r\n/g, "\n");
          let end;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const payload = block
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trimStart())
              .join("\n");
            if (payload) {
              const result = unwrap(JSON.parse(payload));
              if (result !== undefined) return result;
            }
          }
        }
      }
      if (!sse) {
        const result = unwrap(JSON.parse(buffer));
        if (result !== undefined) return result;
      }
      throw new Error("Respons MCP tidak memuat ID permintaan yang sesuai.");
    } finally {
      await reader.cancel();
    }
  }
  async initialize() {
    const data = await this.rpc("initialize", {
      protocolVersion: this.version,
      capabilities: {},
      clientInfo: { name: "astra-workspace", version: "1.1.0" },
    });
    if (
      !["2024-11-05", "2025-03-26", "2025-06-18"].includes(data.protocolVersion)
    )
      throw new Error("Versi MCP server belum didukung.");
    this.version = data.protocolVersion;
    await this.rpc("notifications/initialized", undefined, true);
  }
  async listTools(): Promise<MCPTool[]> {
    await this.initialize();
    const tools: MCPTool[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const result = await this.rpc("tools/list", cursor ? { cursor } : {});
      if (
        !Array.isArray(result.tools) ||
        result.tools.some(
          (t: MCPTool) => !t || typeof t.name !== "string" || !t.inputSchema,
        )
      )
        throw new Error("Daftar tool Graphify tidak valid.");
      tools.push(...result.tools);
      if (!result.nextCursor) return tools;
      cursor = result.nextCursor;
    }
    throw new Error("Daftar tool terlalu panjang; pagination belum selesai.");
  }
  async call(name: string, args: Record<string, unknown>) {
    const tools = await this.listTools();
    if (!tools.some((t) => t.name === name))
      throw new Error("Tool tidak tersedia dari Graphify.");
    return this.rpc("tools/call", { name, arguments: args });
  }
  async close() {
    if (this.session) {
      try {
        const response = await this.fetcher(this.url, {
          method: "DELETE",
          headers: this.headers(),
          signal: AbortSignal.timeout(3000),
          redirect: "error",
        });
        await response.body?.cancel();
      } catch {
        /* Session cleanup must not hide the original outcome. */
      }
    }
  }
}
