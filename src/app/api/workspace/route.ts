import { join } from "node:path";
import { guardLocal, readBody } from "../../../lib/server/http.ts";
import { RunStore } from "../../../lib/server/run-store.ts";
import { codeDigest, materialize } from "../../../lib/server/code-workspace.ts";
import { runNodeTests } from "../../../lib/server/test-runner.ts";
export const runtime = "nodejs";
export const maxDuration = 60;
const store = new RunStore(join(process.cwd(), ".data", "runs"));
const globalState = globalThis as typeof globalThis & {
  astraWorkspaceLocks?: Set<string>;
};
const locks = (globalState.astraWorkspaceLocks ??= new Set<string>());
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
  if (
    typeof body.id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(body.id) ||
    !["apply", "test"].includes(String(body.action)) ||
    body.approved !== true
  )
    return Response.json(
      { error: "Tinjau proposal dan pilih tindakan terlebih dahulu." },
      { status: 400 },
    );
  if (locks.has(body.id))
    return Response.json(
      { error: "Tindakan untuk run ini masih berlangsung." },
      { status: 409 },
    );
  locks.add(body.id);
  try {
    const run = await store.read(body.id);
    if (
      !run ||
      !run.files?.length ||
      !["completed", "failed"].includes(run.status)
    )
      throw new Error("Proposal kode belum tersedia.");
    if (body.digest !== codeDigest(run.files))
      return Response.json(
        { error: "Proposal berubah. Muat ulang sebelum melanjutkan." },
        { status: 409 },
      );
    const { path } = await materialize(
      join(process.cwd(), ".data", "workspaces"),
      run.id,
      run.files,
    );
    await store.recordWorkspace(run.id, path);
    if (body.action === "apply")
      return Response.json({
        path,
        message: "Berkas proposal disimpan di folder terpisah.",
      });
    // Test a clean snapshot of the reviewed files, not arbitrary additions to the user-editable folder.
    const snapshot = await materialize(
      join(process.cwd(), ".data", "test-snapshots"),
      run.id,
      run.files,
    );
    const result = await runNodeTests(
      snapshot.path,
      run.files.filter((f) => f.path.endsWith(".test.mjs")).map((f) => f.path),
    );
    await store.recordTest(run.id, result);
    return Response.json({ result, path });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Tindakan gagal." },
      { status: 400 },
    );
  } finally {
    locks.delete(body.id);
  }
}
