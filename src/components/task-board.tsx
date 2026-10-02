"use client";
import { useState, type FormEvent } from "react";
import RunPanel from "./run-panel";
import { Plus, Trash2, Search, ArrowRight } from "lucide-react";
import {
  assignTask,
  statuses,
  type AgentId,
  type Task,
  type WorkspaceState,
} from "@/lib/domain";
type Props = {
  state: WorkspaceState;
  update: (fn: (s: WorkspaceState) => WorkspaceState, message: string) => void;
};
export default function TaskBoard({ state, update }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") || "").trim();
    if (!title) {
      setError("Judul wajib diisi.");
      return;
    }
    const agent = data.get("agent") as AgentId;
    if (!state.agents.some((a) => a.id === agent && a.enabled)) {
      setError("Pilih agent yang aktif.");
      return;
    }
    const task: Task = {
      id: editing ?? crypto.randomUUID(),
      title,
      description: String(data.get("description") || ""),
      agent,
      status: editing
        ? state.tasks.find((t) => t.id === editing)!.status
        : "Todo",
      priority: data.get("priority") as Task["priority"],
      sample: false,
      createdAt: new Date().toISOString(),
    };
    update(
      (s) => ({
        ...s,
        tasks: editing
          ? s.tasks.map((t) =>
              t.id === editing ? { ...task, createdAt: t.createdAt } : t,
            )
          : [task, ...s.tasks],
      }),
      `${editing ? "Mengubah" : "Membuat"} tugas lokal: ${title}`,
    );
    setAdding(false);
    setEditing(null);
    setError("");
  }
  const edited = state.tasks.find((t) => t.id === editing);
  const visible = state.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || t.agent === filter),
  );
  return (
    <section className="page-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Task management</p>
          <h1>Ruang untuk ide besar.</h1>
          <p>
            Berikan arahan ke Astra atau tetapkan pemilik tugas secara manual.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setAdding(!adding);
            setEditing(null);
          }}
        >
          <Plus size={18} />
          Tugas baru
        </button>
      </div>
      <div className="notice">
        Board manual · Status task diubah oleh Anda. Eksekusi dan hasil AI
        tercatat terpisah pada panel di bawah.
      </div>
      {(adding || editing) && (
        <form className="task-form" onSubmit={save} key={editing ?? "new"}>
          <h2>{editing ? "Edit tugas" : "Tugas baru untuk tim"}</h2>
          <label>
            Judul
            <input
              name="title"
              required
              maxLength={140}
              defaultValue={edited?.title}
              autoFocus
            />
          </label>
          <label>
            Brief
            <textarea
              name="description"
              rows={3}
              maxLength={3000}
              defaultValue={edited?.description}
            />
          </label>
          <div className="form-row">
            <label>
              Ditugaskan kepada
              <select name="agent" defaultValue={edited?.agent ?? "astra"}>
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id} disabled={!a.enabled}>
                    {a.name} · {a.role}
                    {!a.enabled ? " (nonaktif)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioritas
              <select
                name="priority"
                defaultValue={edited?.priority ?? "Normal"}
              >
                <option>Normal</option>
                <option>High</option>
              </select>
            </label>
          </div>
          {error && <p role="alert">{error}</p>}
          <div className="flex gap-2">
            <button className="primary" type="submit">
              Simpan tugas
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setEditing(null);
                setError("");
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      <RunPanel state={state} />
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Cari tugas"
            placeholder="Cari tugas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter agent"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Semua agent</option>
          {state.agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="kanban">
        {statuses.map((status) => (
          <section key={status} className="kanban-column">
            <h2>
              <span
                className={`status-dot status-${status.replace(" ", "")}`}
              />
              {status}
              <span className="count">
                {visible.filter((t) => t.status === status).length}
              </span>
            </h2>
            {visible
              .filter((t) => t.status === status)
              .map((t) => (
                <article className="task-card" key={t.id}>
                  <div className="flex justify-between items-center">
                    <span
                      className={
                        t.priority === "High" ? "priority high" : "priority"
                      }
                    >
                      {t.priority}
                    </span>
                    {t.sample && <span className="sample">Contoh</span>}
                  </div>
                  <button
                    className="task-title"
                    onClick={() => {
                      setEditing(t.id);
                      setAdding(false);
                    }}
                  >
                    {t.title}
                  </button>
                  <p>{t.description || "Belum ada brief."}</p>
                  <label className="mini-label">
                    Pemilik
                    <select
                      value={t.agent}
                      onChange={(e) => {
                        try {
                          const updated = assignTask(
                            t,
                            e.target.value as AgentId,
                            state.agents,
                          );
                          update(
                            (s) => ({
                              ...s,
                              tasks: s.tasks.map((x) =>
                                x.id === t.id ? updated : x,
                              ),
                            }),
                            `Menetapkan ${t.title} kepada ${updated.agent} secara manual`,
                          );
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    >
                      {state.agents.map((a) => (
                        <option value={a.id} key={a.id} disabled={!a.enabled}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mini-label">
                    Status manual
                    <select
                      value={t.status}
                      onChange={(e) =>
                        update(
                          (s) => ({
                            ...s,
                            tasks: s.tasks.map((x) =>
                              x.id === t.id
                                ? {
                                    ...x,
                                    status: e.target.value as Task["status"],
                                  }
                                : x,
                            ),
                          }),
                          `Status manual: ${t.title} → ${e.target.value}`,
                        )
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <div className="task-actions">
                    <button title="Edit tugas" onClick={() => setEditing(t.id)}>
                      Detail <ArrowRight size={14} />
                    </button>
                    <button
                      aria-label={`Hapus ${t.title}`}
                      onClick={() => setDeleting(t.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {deleting === t.id && (
                    <div className="confirm">
                      <p>Hapus tugas ini?</p>
                      <button
                        onClick={() => {
                          update(
                            (s) => ({
                              ...s,
                              tasks: s.tasks.filter((x) => x.id !== t.id),
                            }),
                            `Menghapus tugas: ${t.title}`,
                          );
                          setDeleting(null);
                          if (editing === t.id) setEditing(null);
                        }}
                      >
                        Ya, hapus
                      </button>
                      <button onClick={() => setDeleting(null)}>Batal</button>
                    </div>
                  )}
                </article>
              ))}
            {!visible.some((t) => t.status === status) && (
              <p className="empty-column">Belum ada tugas.</p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
