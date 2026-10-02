export type AgentId = "astra" | "rodeo" | "alpha" | "delta";
export type TaskStatus = "Todo" | "In progress" | "Review" | "Done";
export type Task = {
  id: string;
  title: string;
  description: string;
  agent: AgentId;
  status: TaskStatus;
  priority: "Normal" | "High";
  sample: boolean;
  createdAt: string;
};
export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  personality: string;
  enabled: boolean;
};
export type Activity = { id: string; text: string; at: string };
export type WorkspaceState = {
  version: 1;
  agents: Agent[];
  tasks: Task[];
  activities: Activity[];
};
export const agents: Agent[] = [
  {
    id: "astra",
    name: "Astra",
    role: "Orchestrator",
    color: "#a896ce",
    personality:
      "Tenang dan terorganisir. Menerima arahan Agent lalu membagi pekerjaan tim.",
    enabled: true,
  },
  {
    id: "rodeo",
    name: "Rodeo",
    role: "Developer",
    color: "#deaa7d",
    personality:
      "Penasaran, praktis, dan senang memecahkan masalah melalui kode.",
    enabled: true,
  },
  {
    id: "alpha",
    name: "Alpha",
    role: "Analyst",
    color: "#d8bf78",
    personality:
      "Teliti dan reflektif. Mengubah pertanyaan menjadi kebutuhan yang jelas.",
    enabled: true,
  },
  {
    id: "delta",
    name: "Delta",
    role: "QA",
    color: "#c4a8ca",
    personality:
      "Sabar dan kritis. Memeriksa alur serta menemukan kasus yang terlewat.",
    enabled: true,
  },
];
export const statuses: TaskStatus[] = ["Todo", "In progress", "Review", "Done"];
export const initialState: WorkspaceState = {
  version: 1,
  agents,
  tasks: [
    {
      id: "sample-1",
      title: "Susun kebutuhan workspace",
      description: "Contoh task lokal untuk memperkenalkan board.",
      agent: "alpha",
      status: "Todo",
      priority: "Normal",
      sample: true,
      createdAt: "2026-10-01T00:00:00Z",
    },
    {
      id: "sample-2",
      title: "Implementasi tampilan office",
      description: "Contoh data, bukan pekerjaan agent yang sedang berjalan.",
      agent: "rodeo",
      status: "Review",
      priority: "High",
      sample: true,
      createdAt: "2026-10-01T00:00:00Z",
    },
  ],
  activities: [],
};
export function validState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const s = value as WorkspaceState;
  return (
    s.version === 1 &&
    Array.isArray(s.agents) &&
    s.agents.length === 4 &&
    agents.every((a) =>
      s.agents.some(
        (b) =>
          b &&
          b.id === a.id &&
          typeof b.name === "string" &&
          typeof b.personality === "string" &&
          typeof b.enabled === "boolean",
      ),
    ) &&
    Array.isArray(s.tasks) &&
    s.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.description === "string" &&
        agents.some((a) => a.id === t.agent) &&
        statuses.includes(t.status) &&
        ["Normal", "High"].includes(t.priority) &&
        typeof t.sample === "boolean" &&
        typeof t.createdAt === "string",
    ) &&
    Array.isArray(s.activities) &&
    s.activities.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.text === "string" &&
        typeof a.at === "string",
    )
  );
}
export function assignTask(task: Task, agent: AgentId, team: Agent[]): Task {
  if (!team.some((a) => a.id === agent && a.enabled))
    throw new Error("Agent sedang dinonaktifkan.");
  return { ...task, agent };
}
