import { join } from "node:path";
import { RunStore } from "../../../lib/server/run-store.ts";
import { executeRun } from "../../../lib/server/orchestrator.ts";
import { guardLocal, readBody } from "../../../lib/server/http.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1200;
const store = new RunStore(join(process.cwd(), ".data", "runs"));
const globalState = globalThis as typeof globalThis & {
  astraActiveRuns?: Map<string, string>;
};
const active = (globalState.astraActiveRuns ??= new Map<string, string>());
export async function GET(request: Request) {
  try {
    guardLocal(request);
  } catch {
    return Response.json({ error: "Akses ditolak." }, { status: 403 });
  }
  const runs = await store.list();
  for (const run of runs) {
    if (["queued", "running"].includes(run.status) && !active.has(run.id)) {
      const latest = await store.read(run.id);
      if (
        !latest ||
        !["queued", "running"].includes(latest.status) ||
        active.has(run.id)
      )
        continue;
      await store.transition(
        run.id,
        "failed",
        {
          source: "server",
          message:
            "Eksekusi terputus saat server restart; status provider tidak diketahui.",
        },
        {
          error:
            "Server berhenti sebelum penyelesaian tercatat. Tidak dilanjutkan otomatis.",
        },
      );
    }
  }
  return Response.json(
    { runs: await store.list() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
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
    return Response.json(
      { error: "Permintaan tidak valid / terlalu besar." },
      { status: 400 },
    );
  }
  const { id, taskId, title, brief, agent, enabled, useGraphify, codeMode } =
    body;
  const ids = ["astra", "alpha", "rodeo", "delta"];
  if (
    (useGraphify !== undefined && typeof useGraphify !== "boolean") ||
    (codeMode !== undefined && typeof codeMode !== "boolean") ||
    (codeMode === true &&
      (agent !== "astra" ||
        !Array.isArray(enabled) ||
        !enabled.includes("rodeo") ||
        !enabled.includes("delta"))) ||
    typeof id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(id) ||
    typeof taskId !== "string" ||
    !taskId.trim() ||
    taskId.length > 150 ||
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 140 ||
    typeof brief !== "string" ||
    brief.length > 3000 ||
    typeof agent !== "string" ||
    !ids.includes(agent) ||
    !Array.isArray(enabled) ||
    !enabled.every((x) => typeof x === "string" && ids.includes(x)) ||
    !enabled.includes(agent) ||
    (agent === "astra" && !enabled.some((x) => x !== "astra"))
  )
    return Response.json(
      { error: "Isi tugas dan agent aktif tidak valid." },
      { status: 400 },
    );
  if (!process.env.OPENAI_API_KEY)
    return Response.json(
      { error: "Isi OPENAI_API_KEY di .env.local lalu restart server." },
      { status: 503 },
    );
  if (active.has(id))
    return Response.json({ id, pending: true }, { status: 202 });
  if (active.size > 0)
    return Response.json(
      { error: "Satu eksekusi sedang berlangsung. Tunggu hingga selesai." },
      { status: 409 },
    );
  active.set(id, taskId);
  try {
    const existing = await store.read(id);
    if (existing) return Response.json({ run: existing, reused: true });
    const run = await store.create(
      taskId,
      agent as "astra" | "alpha" | "rodeo" | "delta",
      {
        id,
        title,
        brief,
        enabled: enabled as string[],
        useGraphify: useGraphify === true,
        codeMode: codeMode === true,
      },
    );
    // Await execution: no detached promise, cron, or untracked background worker.
    await executeRun(store, run);
    return Response.json({ run: await store.read(id) });
  } catch {
    return Response.json(
      {
        error: "Eksekusi gagal dicatat. Periksa riwayat sebelum mencoba ulang.",
      },
      { status: 500 },
    );
  } finally {
    active.delete(id);
  }
}
