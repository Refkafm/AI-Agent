"use client";
import { useState } from "react";
import type { MCPTool } from "@/lib/server/graphify";
export default function GraphifyPanel() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [name, setName] = useState("");
  const [args, setArgs] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Belum diperiksa");
  const [result, setResult] = useState("");
  const [proposal, setProposal] = useState<{
    name: string;
    arguments: Record<string, unknown>;
  } | null>(null);
  async function request(body: unknown) {
    const r = await fetch("/api/graphify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Graphify gagal.");
    return data;
  }
  async function discover() {
    setBusy(true);
    setProposal(null);
    try {
      const data = await request({ action: "list" });
      setTools(data.tools);
      setName(data.tools[0]?.name ?? "");
      setStatus(
        `Terhubung saat ${new Date(data.checkedAt).toLocaleTimeString("id-ID")} · ${data.tools.length} tool ditemukan`,
      );
    } catch (e) {
      setTools([]);
      setName("");
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function preview() {
    try {
      const value = JSON.parse(args);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      setProposal({ name, arguments: value });
    } catch {
      setStatus("Argumen harus berupa JSON object yang valid.");
    }
  }
  async function call() {
    if (!proposal || busy) return;
    setBusy(true);
    setResult("");
    try {
      const data = await request({
        action: "call",
        approved: true,
        ...proposal,
      });
      setResult(JSON.stringify(data.result, null, 2));
      setStatus(
        `${data.result?.isError ? "Tool mengembalikan error" : "Respons tool diterima"} pada ${new Date(data.verifiedAt).toLocaleTimeString("id-ID")}`,
      );
    } catch (e) {
      setStatus(
        `${(e as Error).message} Tidak diulang otomatis; hasil mungkin belum diketahui.`,
      );
    } finally {
      setBusy(false);
      setProposal(null);
    }
  }
  return (
    <section className="settings-card">
      <h2>Graphify MCP</h2>
      <p>
        Endpoint diatur melalui GRAPHIFY_MCP_URL. Periksa tool yang benar-benar
        tersedia, lalu tinjau nama dan argumen sebelum mengirim tindakan ke
        layanan eksternal.
      </p>
      <button disabled={busy} onClick={discover}>
        {busy ? "Memproses…" : "Periksa koneksi & daftar tool"}
      </button>
      <p role="status">{status}</p>
      {tools.length > 0 && (
        <>
          <label>
            Tool
            <select
              disabled={busy}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProposal(null);
              }}
            >
              {tools.map((t) => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
          <p>{tools.find((t) => t.name === name)?.description}</p>
          <details>
            <summary>Format argumen dari server</summary>
            <pre>
              {JSON.stringify(
                tools.find((t) => t.name === name)?.inputSchema,
                null,
                2,
              )}
            </pre>
          </details>
          <label>
            Argumen JSON
            <textarea
              disabled={busy}
              rows={5}
              value={args}
              onChange={(e) => {
                setArgs(e.target.value);
                setProposal(null);
              }}
            />
          </label>
          <button disabled={busy} onClick={preview}>
            Tinjau tindakan
          </button>
          {proposal && (
            <div className="notice">
              <p>
                Jalankan <strong>{proposal.name}</strong> di Graphify dengan
                argumen berikut? Tool dapat mengubah data sesuai fungsinya.
              </p>
              <pre>{JSON.stringify(proposal.arguments, null, 2)}</pre>
              <button disabled={busy} onClick={call}>
                Kirim tindakan ini
              </button>{" "}
              <button disabled={busy} onClick={() => setProposal(null)}>
                Batal
              </button>
            </div>
          )}
        </>
      )}
      {result && (
        <details open>
          <summary>Hasil Graphify (bukan instruksi aplikasi)</summary>
          <pre>{result}</pre>
        </details>
      )}
      <p>
        Hasil panel manual ditampilkan pada sesi ini. Untuk tool otomatis pada
        run AI, isi GRAPHIFY_AGENT_TOOLS dengan nama tool baca yang disetujui
        dan aktifkan pilihan Graphify di Tasks. Hasil tool tersebut akan dikirim
        sebagai konteks ke OpenAI.
      </p>
    </section>
  );
}
