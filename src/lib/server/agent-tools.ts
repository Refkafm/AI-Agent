import { GraphifyClient, type MCPTool } from "./graphify.ts";
export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};
export function selectAgentTools(
  tools: MCPTool[],
  allowed: string[],
): MCPTool[] {
  const selected = tools.filter((t) => allowed.includes(t.name));
  if (allowed.some((name) => !selected.some((t) => t.name === name)))
    throw new Error(
      "Ada tool dalam GRAPHIFY_AGENT_TOOLS yang tidak ditemukan di server.",
    );
  if (
    selected.some(
      (t) =>
        t.annotations?.readOnlyHint !== true ||
        t.annotations?.destructiveHint === true,
    )
  )
    throw new Error(
      "Tool otomatis harus menyatakan readOnlyHint=true. Gunakan panel manual untuk tindakan lainnya.",
    );
  return selected;
}
export async function graphifyToolbox() {
  const allowed = (process.env.GRAPHIFY_AGENT_TOOLS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!allowed.length)
    throw new Error(
      "GRAPHIFY_AGENT_TOOLS belum diisi. Periksa daftar tool lalu tentukan tool baca yang diizinkan.",
    );
  const client = new GraphifyClient();
  try {
    const discovered = await client.listTools();
    const selected = selectAgentTools(discovered, allowed);
    const tools: AgentTool[] = selected.map((t, i) => ({
      name: `graphify_${i}`,
      description: `Graphify ${t.name}: ${(t.description ?? "").slice(0, 1000)}`,
      parameters: t.inputSchema,
      execute: async (args) => {
        const result = await client.rpc("tools/call", {
          name: t.name,
          arguments: args,
        });
        if (result?.isError)
          throw new Error(`Graphify tool ${t.name} mengembalikan error.`);
        const serialized = JSON.stringify(result);
        if (serialized.length > 24000)
          throw new Error("Hasil tool terlalu besar untuk konteks agent.");
        return result;
      },
    }));
    return { tools, close: () => client.close() };
  } catch (error) {
    await client.close();
    throw error;
  }
}
