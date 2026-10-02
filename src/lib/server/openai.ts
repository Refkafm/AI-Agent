import type { AgentTool } from "./agent-tools.ts";
export type Generation = {
  id: string;
  text: string;
  model: string;
  requestIds?: string[];
};
export type Generate = (
  instructions: string,
  input: string,
  schema?: Record<string, unknown>,
) => Promise<Generation>;
export type ToolAudit = (data: {
  responseId: string;
  name: string;
  stage: "requested" | "completed";
  arguments: Record<string, unknown>;
}) => Promise<void>;
export function modelFor(agent: string) {
  return (
    process.env[`OPENAI_MODEL_${agent.toUpperCase()}`] ||
    process.env.OPENAI_MODEL ||
    "gpt-4.1"
  );
}
export function createGenerator(
  agent: string,
  fetcher: typeof fetch = fetch,
  tools: AgentTool[] = [],
  audit?: ToolAudit,
): Generate {
  return async (instructions, input, schema) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key)
      throw new Error("Isi OPENAI_API_KEY di .env.local lalu restart server.");
    const history: unknown[] = [{ role: "user", content: input }];
    const requestIds: string[] = [];
    let calls = 0;
    for (let round = 0; round < 3; round++) {
      let response: Response;
      try {
        response = await fetcher("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modelFor(agent),
            instructions,
            input: history,
            store: false,
            max_output_tokens: 6000,
            ...(tools.length
              ? {
                  tools: tools.map((t) => ({
                    type: "function",
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                    strict: false,
                  })),
                  parallel_tool_calls: false,
                  tool_choice: round === 2 ? "none" : "auto",
                }
              : {}),
            ...(schema
              ? {
                  text: {
                    format: {
                      type: "json_schema",
                      name: "agent_result",
                      strict: true,
                      schema,
                    },
                  },
                }
              : {}),
          }),
          signal: AbortSignal.timeout(90000),
          redirect: "error",
        });
      } catch {
        throw new Error(
          "OpenAI tidak merespons dalam batas waktu / jaringan gagal. Tidak dicoba ulang otomatis.",
        );
      }
      if (!response.ok)
        throw new Error(
          `OpenAI HTTP ${response.status}. Periksa key, akses model, dan kuota. Tidak dicoba ulang otomatis.`,
        );
      const data = await response.json();
      if (data.status !== "completed" || typeof data.id !== "string")
        throw new Error(
          `Respons OpenAI belum lengkap (${String(data.status)}).`,
        );
      requestIds.push(data.id);
      const output = Array.isArray(data.output) ? data.output : [];
      const requested = output.filter(
        (x: { type: string }) => x.type === "function_call",
      );
      if (requested.length) {
        if (round === 2 || calls + requested.length > 2)
          throw new Error("Batas dua panggilan tool per agent tercapai.");
        history.push(...output);
        for (const item of requested) {
          const tool = tools.find((t) => t.name === item.name);
          if (!tool || typeof item.call_id !== "string")
            throw new Error("Model meminta tool yang tidak diizinkan.");
          const args = JSON.parse(item.arguments);
          if (!args || typeof args !== "object" || Array.isArray(args))
            throw new Error("Argumen tool tidak valid.");
          calls++;
          await audit?.({
            responseId: data.id,
            name: tool.name,
            stage: "requested",
            arguments: args,
          });
          const result = await tool.execute(args);
          await audit?.({
            responseId: data.id,
            name: tool.name,
            stage: "completed",
            arguments: args,
          });
          history.push({
            type: "function_call_output",
            call_id: item.call_id,
            output: JSON.stringify(result),
          });
        }
        continue;
      }
      const text = output
        .filter((x: { type: string }) => x.type === "message")
        .flatMap((x: { content: unknown[] }) => x.content ?? [])
        .filter((x: { type: string }) => x.type === "output_text")
        .map((x: { text: string }) => x.text)
        .join("\n");
      if (!text.trim())
        throw new Error("OpenAI tidak menghasilkan teks (mungkin penolakan).");
      return {
        id: data.id,
        text,
        model: typeof data.model === "string" ? data.model : modelFor(agent),
        requestIds,
      };
    }
    throw new Error("Batas interaksi OpenAI tercapai.");
  };
}
export async function checkOpenAI() {
  if (!process.env.OPENAI_API_KEY)
    return { connected: false, detail: "OPENAI_API_KEY belum diisi." };
  try {
    const r = await fetch(
      `https://api.openai.com/v1/models/${encodeURIComponent(modelFor("astra"))}`,
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    return {
      connected: r.ok,
      detail: r.ok
        ? `Akses model ${modelFor("astra")} terverifikasi. Generasi belum diuji.`
        : `OpenAI HTTP ${r.status}; periksa key dan akses model.`,
    };
  } catch {
    return { connected: false, detail: "OpenAI tidak dapat dijangkau." };
  }
}
