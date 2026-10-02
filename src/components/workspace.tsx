"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  Home,
  Layers,
  LayoutGrid,
  ListTodo,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Settings2,
  Sparkles,
  Users,
  X,
  Download,
  Unplug,
} from "lucide-react";
import { useWorkspace } from "./use-workspace";
import SoundToggle from "./sound-toggle";
import TaskBoard from "./task-board";
import GraphifyPanel from "./graphify-panel";
import { rooms, type RoomId } from "@/lib/rooms";
import type { AgentId } from "@/lib/domain";
import type { Direction, ViewCommand } from "./office/scene";
const Scene = dynamic(() => import("./office/scene"), {
  ssr: false,
  loading: () => (
    <div className="scene-fallback">
      <span className="loading-orb" />
      <p>Menyusun kantor kecil Anda…</p>
    </div>
  ),
});
const faces: Record<string, string> = {
  astra: "◉",
  rodeo: "◆",
  alpha: "●",
  delta: "⋈",
};
const tabs = [
  { id: "office", name: "Office", icon: Home },
  { id: "agents", name: "Agents", icon: Users },
  { id: "tasks", name: "Tasks", icon: ListTodo },
  { id: "activity", name: "Activity", icon: Activity },
  { id: "settings", name: "Integrations", icon: Settings2 },
];
export default function Workspace() {
  const { state, ready, update, storageError } = useWorkspace();
  const [tab, setTab] = useState("office");
  const [room, setRoom] = useState<RoomId>("all");
  const [floor, setFloor] = useState<"both" | "main" | "basement">("both");
  const [inside, setInside] = useState(false);
  const [paused, setPaused] = useState(false);
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState<AgentId | "supervisor" | null>(null);
  const [showRoom, setShowRoom] = useState(false);
  const [direction, setDirection] = useState<Direction>(null);
  const [command, setCommand] = useState<ViewCommand>({
    kind: "reset",
    seq: 0,
  });
  const [connection, setConnection] = useState("Belum terhubung");
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(m.matches);
    const fn = () => setPaused(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (tabs.some((t) => t.id === hash)) setTab(hash);
    const listener = () =>
      setTab(
        tabs.some((t) => t.id === location.hash.slice(1))
          ? location.hash.slice(1)
          : "office",
      );
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setShowRoom(false);
        setInside(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  function navigate(id: string) {
    location.hash = id;
    setTab(id);
    setDirection(null);
  }
  function chooseRoom(id: RoomId) {
    setRoom(id);
    setShowRoom(id !== "all");
    setSelected(null);
    if (id === "astra" && floor === "main") setFloor("both");
    if (id !== "astra" && floor === "basement") setFloor("both");
  }
  function cmd(kind: ViewCommand["kind"]) {
    setCommand((c) => ({ kind, seq: c.seq + 1 }));
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "astra-workspace.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Data workspace diekspor.");
  }
  async function checkConnection() {
    setChecking(true);
    try {
      const r = await fetch("/api/integrations");
      if (!r.ok) throw new Error();
      const data = await r.json();
      setConnection(data.connected ? "Terhubung" : "Belum terhubung");
      setToast(data.detail);
    } catch {
      setConnection("Tidak tersedia");
      setToast("Status integrasi tidak dapat diperiksa.");
    } finally {
      setChecking(false);
    }
  }
  const currentAgent = state.agents.find((a) => a.id === selected);
  const currentRoom = rooms.find((r) => r.id === room)!;
  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="#office" className="brand" onClick={() => navigate("office")}>
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          <span>
            Astra<span className="brand-sub">workspace</span>
          </span>
        </a>
        <nav aria-label="Navigasi utama">
          {tabs.map((t) => (
            <a
              href={`#${t.id}`}
              key={t.id}
              aria-current={tab === t.id ? "page" : undefined}
              className={tab === t.id ? "active" : ""}
              onClick={() => navigate(t.id)}
            >
              <t.icon size={17} />
              <span>{t.name}</span>
            </a>
          ))}
        </nav>
        <div className="profile">
          <span className="local-dot" />
          Local workspace<span className="avatar">A</span>
        </div>
      </header>
      {storageError && (
        <div role="alert" className="notice">
          {storageError}
        </div>
      )}
      {!ready ? (
        <div className="scene-fallback">Memuat workspace…</div>
      ) : tab === "office" ? (
        <main className="office-page">
          <div className="office-heading">
            <div>
              <p className="eyebrow">A little space, a great team</p>
              <h1>
                Selamat datang, Agent<span className="title-dot">.</span>
              </h1>
              <p>Semua ide besar dimulai dari meja kecil.</p>
            </div>
            <div className="mode-badge">
              <span />
              Mode lokal <span className="separator">/</span> Data contoh
            </div>
          </div>
          <div className="room-tabs" aria-label="Pilih ruangan">
            {rooms.map((r) => (
              <button
                key={r.id}
                className={room === r.id ? "selected" : ""}
                aria-pressed={room === r.id}
                onClick={() => chooseRoom(r.id)}
              >
                {r.id === "astra" && <ArrowDown size={14} />} {r.name}
              </button>
            ))}
          </div>
          <div className="view-switch">
            <button
              aria-pressed={!inside}
              className={!inside ? "selected" : ""}
              onClick={() => setInside(false)}
            >
              <LayoutGrid size={16} />
              Tycoon view
            </button>
            <button
              aria-pressed={inside}
              className={inside ? "selected" : ""}
              onClick={() => {
                setInside(true);
                setShowRoom(false);
                setSelected(null);
              }}
            >
              <ArrowRight size={16} />
              Step inside
            </button>
          </div>
          <div
            className="scene-wrap"
            role="region"
            aria-label="Kantor 3D interaktif. Gunakan tab ruangan dan kartu agent sebagai alternatif keyboard."
          >
            <Scene
              room={room}
              floor={floor}
              inside={inside}
              paused={paused}
              labels={labels}
              command={command}
              direction={direction}
              agents={state.agents}
              onRoom={chooseRoom}
              onAgent={(id) => {
                setSelected(id);
                setShowRoom(false);
              }}
            />
            {(selected || showRoom) && (
              <aside className="inspector" aria-label="Detail pilihan">
                <button
                  className="close-button"
                  aria-label="Tutup detail"
                  onClick={() => {
                    setSelected(null);
                    setShowRoom(false);
                  }}
                >
                  <X size={18} />
                </button>
                <p className="eyebrow">
                  {selected ? "Meet your teammate" : "Explore the office"}
                </p>
                <h2>
                  {selected === "supervisor"
                    ? "Agent"
                    : (currentAgent?.name ?? currentRoom.name)}
                </h2>
                <span className="role-chip">
                  {selected === "supervisor"
                    ? "Supervisor"
                    : (currentAgent?.role ?? "Ruangan")}
                </span>
                <p>
                  {selected === "supervisor"
                    ? "Anda mengarahkan tim, memberikan tugas kepada Astra, dan meninjau hasil."
                    : (currentAgent?.personality ?? currentRoom.description)}
                </p>
                {currentAgent && (
                  <p className="inspector-count">
                    {
                      state.tasks.filter(
                        (t) =>
                          t.agent === currentAgent.id && t.status !== "Done",
                      ).length
                    }{" "}
                    tugas di board lokal
                  </p>
                )}
                <div className="connection-note">
                  <Unplug size={15} />
                  Lihat status eksekusi di Tasks
                </div>
                <button className="primary" onClick={() => navigate("tasks")}>
                  Buka task board <ArrowRight size={16} />
                </button>
              </aside>
            )}
            {inside && (
              <div className="direction-pad" aria-label="Kontrol berjalan">
                {(
                  [
                    { d: "forward", icon: ArrowUp, label: "Maju" },
                    { d: "left", icon: ArrowLeft, label: "Putar kiri" },
                    { d: "back", icon: ArrowDown, label: "Mundur" },
                    { d: "right", icon: ArrowRight, label: "Putar kanan" },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.d}
                    className={b.d}
                    aria-label={b.label}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDirection(b.d);
                    }}
                    onPointerUp={() => setDirection(null)}
                    onPointerCancel={() => setDirection(null)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") setDirection(b.d);
                    }}
                    onKeyUp={() => setDirection(null)}
                    onBlur={() => setDirection(null)}
                  >
                    <b.icon size={20} />
                  </button>
                ))}
              </div>
            )}
            <span className="scene-caption">
              {inside ? "Jelajahi office" : "Your team, under one roof"}
            </span>
          </div>
          <div className="office-controls">
            {!inside && (
              <>
                <label className="floor-select">
                  <Layers size={17} />
                  <select
                    aria-label="Pilih lantai"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value as typeof floor)}
                  >
                    <option value="both">Both floors</option>
                    <option value="main">Main floor</option>
                    <option value="basement">Astra den</option>
                  </select>
                </label>
                <span className="control-divider" />
                <button aria-label="Putar kamera" onClick={() => cmd("rotate")}>
                  <RotateCw size={18} />
                  <span>Orbit</span>
                </button>
                <button aria-label="Perbesar" onClick={() => cmd("zoomIn")}>
                  <Plus size={19} />
                </button>
                <button aria-label="Perkecil" onClick={() => cmd("zoomOut")}>
                  <Minus size={19} />
                </button>
                <button
                  aria-label="Reset kamera"
                  onClick={() => {
                    setRoom("all");
                    cmd("reset");
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              </>
            )}
            <button
              aria-label={
                paused ? "Jalankan animasi dekoratif" : "Jeda animasi dekoratif"
              }
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              aria-label="Tampilkan nama karakter"
              aria-pressed={labels}
              onClick={() => setLabels(!labels)}
            >
              Aa
            </button>
            <span className="control-divider" />
            <SoundToggle />
            <button
              aria-label="Layar penuh"
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen();
                  else await document.documentElement.requestFullscreen();
                } catch {
                  setToast("Layar penuh tidak didukung browser ini.");
                }
              }}
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <p className="control-hint">
            {inside
              ? "WASD / tombol arah untuk berjalan & berputar · Escape untuk kembali"
              : "Drag untuk rotasi · Klik kanan & drag untuk pan · Scroll / pinch untuk zoom"}
          </p>
          <div className="agent-strip">
            {state.agents.map((a) => (
              <button
                key={a.id}
                aria-pressed={selected === a.id}
                onClick={() => {
                  setSelected(a.id);
                  setShowRoom(false);
                }}
                className={selected === a.id ? "selected" : ""}
              >
                <span className={`agent-portrait ${a.id}`}>{faces[a.id]}</span>
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.role}</small>
                </span>
                <span
                  className="agent-indicator"
                  style={{ background: a.enabled ? "#9ab99f" : "#bdb9bb" }}
                />
              </button>
            ))}
          </div>
          <p className="honesty-note">
            Gerakan karakter adalah animasi dekoratif. Aktivitas AI
            terverifikasi hanya ditampilkan pada riwayat eksekusi di Tasks.
          </p>
        </main>
      ) : tab === "tasks" ? (
        <main>
          <TaskBoard state={state} update={update} />
        </main>
      ) : tab === "agents" ? (
        <main className="page-content">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The people behind the pixels</p>
              <h1>Kenali tim kecil Anda.</h1>
              <p>Empat kepribadian, satu tempat untuk berkolaborasi.</p>
            </div>
            <span className="role-chip">
              4 AI agents · OpenAI tersedia via Tasks
            </span>
          </div>
          <div className="agent-grid">
            {state.agents.map((a) => (
              <article className="agent-card" key={a.id}>
                <div className={`portrait-stage ${a.id}`}>
                  <span className={`agent-portrait large ${a.id}`}>
                    {faces[a.id]}
                  </span>
                  <span className="sample">Karakter dekoratif</span>
                </div>
                <div className="agent-card-body">
                  <p className="eyebrow">{a.role}</p>
                  <h2>{a.name}</h2>
                  <p>{a.personality}</p>
                  <p>
                    {state.tasks.filter((t) => t.agent === a.id).length} tugas
                    lokal
                  </p>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={a.enabled}
                      onChange={(e) =>
                        update(
                          (s) => ({
                            ...s,
                            agents: s.agents.map((x) =>
                              x.id === a.id
                                ? { ...x, enabled: e.target.checked }
                                : x,
                            ),
                          }),
                          `${e.target.checked ? "Mengaktifkan" : "Menonaktifkan"} ${a.name} untuk penugasan lokal`,
                        )
                      }
                    />
                    Tersedia untuk tugas lokal
                  </label>
                  <details>
                    <summary>Edit profil</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const name = String(f.get("name")).trim();
                        if (!name) return;
                        update(
                          (s) => ({
                            ...s,
                            agents: s.agents.map((x) =>
                              x.id === a.id
                                ? {
                                    ...x,
                                    name,
                                    personality: String(f.get("personality")),
                                  }
                                : x,
                            ),
                          }),
                          `Memperbarui profil ${a.name}`,
                        );
                        setToast("Profil disimpan.");
                      }}
                    >
                      <label>
                        Nama
                        <input
                          name="name"
                          maxLength={30}
                          required
                          defaultValue={a.name}
                        />
                      </label>
                      <label>
                        Kepribadian
                        <textarea
                          name="personality"
                          maxLength={500}
                          defaultValue={a.personality}
                        />
                      </label>
                      <button type="submit">
                        <Check size={16} />
                        Simpan
                      </button>
                    </form>
                  </details>
                  <button
                    onClick={() => {
                      navigate("office");
                      setSelected(a.id);
                      setRoom(a.id === "astra" ? "astra" : "it");
                    }}
                  >
                    Lihat di office <ArrowRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </main>
      ) : tab === "activity" ? (
        <main className="page-content narrow">
          <p className="eyebrow">Workspace journal</p>
          <h1>Jejak aktivitas.</h1>
          <p className="muted">
            Catatan tindakan Anda di aplikasi ini. Log eksekusi AI tersedia pada
            halaman Tasks.
          </p>
          <div className="activity-list">
            {state.activities.length ? (
              state.activities.map((a) => (
                <article key={a.id}>
                  <span className="activity-icon">
                    <Check size={17} />
                  </span>
                  <div>
                    <p>{a.text}</p>
                    <time>{new Date(a.at).toLocaleString("id-ID")}</time>
                  </div>
                  <span className="sample">Lokal</span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <Activity size={32} />
                <h2>Halaman baru untuk tim Anda.</h2>
                <p>
                  Buat tugas atau ubah profil agent untuk mulai mencatat
                  aktivitas.
                </p>
                <button onClick={() => navigate("tasks")}>
                  Buat tugas pertama
                </button>
              </div>
            )}
          </div>
        </main>
      ) : (
        <main className="page-content narrow">
          <p className="eyebrow">Make room for more</p>
          <h1>Integrations & data.</h1>
          <p className="muted">Workspace berfungsi lokal tanpa API key.</p>
          <section className="settings-card">
            <Unplug size={26} />
            <h2>OpenAI API</h2>
            <span className="role-chip">{connection}</span>
            <p>
              Isi OPENAI_API_KEY di .env.local lalu restart server. Gunakan
              tombol Jalankan dengan OpenAI pada halaman Tasks. Model tiap agent
              dapat diatur lewat environment.
            </p>
            <button disabled={checking} onClick={checkConnection}>
              {checking ? "Memeriksa…" : "Periksa status"}
            </button>
          </section>
          <GraphifyPanel />
          <section className="settings-card">
            <h2>Knowledge library</h2>
            <p>
              0 dokumen. Belum ada sumber knowledge base yang dihubungkan. Buku
              dalam office adalah dekorasi.
            </p>
          </section>
          <section className="settings-card">
            <Download size={26} />
            <h2>Data milik Anda.</h2>
            <p>
              Tugas, profil, dan aktivitas disimpan di browser ini. Ekspor JSON
              untuk cadangan. Menghapus data browser akan menghapus workspace
              lokal.
            </p>
            <button onClick={exportData}>
              <Download size={16} />
              Ekspor workspace
            </button>
          </section>
          <section className="settings-card">
            <h2>Apa yang berjalan?</h2>
            <p>
              Server Next.js dan tab browser harus tetap terbuka untuk
              menggunakan aplikasi. Animasi dan audio hanya berjalan di tab;
              terpisah dari eksekusi AI. Permintaan OpenAI berjalan setelah Anda
              memilih Jalankan di Tasks. Biarkan server dan tab terbuka sampai
              selesai. Tidak ada worker persisten; restart server dapat memutus
              eksekusi.
            </p>
          </section>
        </main>
      )}
      <footer className="app-footer">
        <span>Astra Workspace</span>
        <span>
          Built for your little IT team <span className="footer-spark">✧</span>
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
