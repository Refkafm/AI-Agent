"use client";
import { useEffect, useState, useRef } from "react";
import type { WorkspaceState } from "@/lib/domain";
import type { AgentRun } from "@/lib/server/run-store";
export default function RunPanel({ state }: { state: WorkspaceState }) {
  const [taskId, setTaskId] = useState("");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(false);
  const [checked, setChecked] = useState("");
  const lock = useRef(false);
  const [useGraphify, setUseGraphify] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  async function codeAction(run: AgentRun, action: "apply" | "test") {
    if (actionBusy) return;
    setActionBusy(run.id);
    setError("");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: run.id,
          action,
          approved: true,
          digest: run.proposalDigest,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  }
  async function refresh() {
    try {
      const r = await fetch("/api/runs", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setRuns(data.runs);
      setFresh(true);
      setChecked(new Date().toLocaleTimeString("id-ID"));
    } catch {
      setFresh(false);
    }
  }
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (alive) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  async function start() {
    if (lock.current) return;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const id = crypto.randomUUID();
    try {
      const r = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          useGraphify,
          codeMode,
          taskId: task.id,
          title: task.title,
          brief: task.description,
          agent: task.agent,
          enabled: state.agents.filter((a) => a.enabled).map((a) => a.id),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Eksekusi gagal.");
      if (data.run?.status === "failed") setError(data.run.error);
      await refresh();
    } catch (e) {
      setError(
        `${(e as Error).message} Periksa riwayat sebelum menjalankan lagi; jangan mengulang permintaan yang statusnya belum jelas.`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const active = runs.some(
    (r) => r.status === "running" || r.status === "queued",
  );
  return (
    <section className="settings-card">
      <h2>Jalankan tim AI</h2>
      <p>
        Pilih tugas nyata. Astra membagi pekerjaan ke agent aktif; tugas dengan
        pemilik lain dijalankan oleh agent tersebut. Maksimal 4 permintaan
        OpenAI tanpa tool, atau 12 dengan Graphify; menggunakan saldo API Anda.
      </p>
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={useGraphify}
          disabled={busy || active}
          onChange={(e) => setUseGraphify(e.target.checked)}
        />
        Izinkan agent menggunakan tool Graphify baca yang tercantum di
        GRAPHIFY_AGENT_TOOLS.
      </label>
      <label className="toggle-label">
        <input
          type="checkbox"
          checked={codeMode}
          disabled={busy || active}
          onChange={(e) => setCodeMode(e.target.checked)}
        />
        Mode kode untuk Astra: Rodeo membuat berkas, Delta membuat tes. Simpan
        dan uji setelah review.
      </label>
      <div className="form-row">
        <label>
          Tugas
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={busy}
          >
            <option value="">Pilih tugas non-contoh…</option>
            {state.tasks
              .filter((t) => !t.sample)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · {t.agent}
                </option>
              ))}
          </select>
        </label>
        <button
          className="primary"
          disabled={!taskId || busy || active || !fresh}
          onClick={start}
        >
          {busy || active
            ? "Eksekusi sedang diproses"
            : "Jalankan dengan OpenAI"}
        </button>
      </div>
      <p role="status">
        {fresh
          ? `Riwayat server diperiksa ${checked}`
          : "Server belum terjangkau; status di bawah mungkin sudah tidak mutakhir."}
      </p>
      {error && <p role="alert">{error}</p>}
      {runs.length === 0 && (
        <p>
          Belum ada eksekusi AI. Task board manual terpisah dari hasil provider.
        </p>
      )}
      {runs.map((run) => (
        <details className="run-item" key={run.id}>
          <summary>
            <strong>{run.title || run.taskId}</strong> ·{" "}
            {run.status === "completed"
              ? "Respons AI selesai — perlu review"
              : run.status}{" "}
            · {run.agent}
          </summary>
          <small>
            Run {run.id} · {new Date(run.updatedAt).toLocaleString("id-ID")}
          </small>
          {run.error && <p role="alert">{run.error}</p>}
          {run.steps?.map((s, i) => (
            <section className="run-step" key={`${s.responseId}-${i}`}>
              <h3>
                {s.agent} — {s.model}
              </h3>
              <p>{s.brief}</p>
              <small>
                Respons {s.responseId} ·{" "}
                {new Date(s.verifiedAt).toLocaleString("id-ID")}
              </small>
              <pre>{s.output}</pre>
            </section>
          ))}
          {!!run.files?.length && (
            <section className="run-step">
              <h3>Proposal berkas ({run.files.length})</h3>
              <p>
                Berkas baru untuk folder kerja terpisah. Tidak menimpa
                repository lain.
              </p>
              {run.files.map((file) => (
                <details key={file.path}>
                  <summary>+ {file.path}</summary>
                  <pre>{file.content}</pre>
                </details>
              ))}
              <div className="flex gap-2">
                <button
                  disabled={
                    !!actionBusy ||
                    !["completed", "failed"].includes(run.status)
                  }
                  onClick={() => codeAction(run, "apply")}
                >
                  Simpan berkas yang ditinjau
                </button>
                <button
                  disabled={
                    !!actionBusy ||
                    !run.files.some((f) => f.path.endsWith(".test.mjs")) ||
                    !["completed", "failed"].includes(run.status)
                  }
                  onClick={() => codeAction(run, "test")}
                >
                  {actionBusy === run.id
                    ? "Memproses…"
                    : "Simpan & jalankan tes Docker"}
                </button>
              </div>
              {run.workspace && <p>Folder: {run.workspace}</p>}
              {run.testResult && (
                <>
                  <p>
                    Hasil proses tes: <strong>{run.testResult.status}</strong> ·
                    exit {run.testResult.exitCode ?? "tidak tersedia"}
                  </p>
                  <pre>{run.testResult.log}</pre>
                </>
              )}
            </section>
          )}
          <details>
            <summary>Jejak eksekusi</summary>
            {run.events.map((e, i) => (
              <p key={i}>
                <small>
                  {e.at} · {e.source}
                </small>
                <br />
                {e.message}
              </p>
            ))}
          </details>
        </details>
      ))}
    </section>
  );
}
