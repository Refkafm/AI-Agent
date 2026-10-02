import { mkdir, readFile, writeFile, rename, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";

export type RunStatus = "queued" | "running" | "completed" | "failed";
export type RunEvent = {
  at: string;
  source: "server" | "provider";
  message: string;
  providerResponseId?: string;
};
export type RunStep = {
  agent: string;
  brief: string;
  output: string;
  responseId: string;
  model: string;
  verifiedAt: string;
};
export type AgentRun = {
  proposalDigest?: string;
  useGraphify?: boolean;
  codeMode?: boolean;
  files?: import("./code-workspace.ts").CodeFile[];
  workspace?: string;
  testResult?: import("./test-runner.ts").TestResult;
  title?: string;
  brief?: string;
  enabled?: string[];
  steps?: RunStep[];
  id: string;
  taskId: string;
  agent: "astra" | "rodeo" | "alpha" | "delta";
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  events: RunEvent[];
  output?: string;
  error?: string;
};

/** Local server persistence. No network request or model execution is performed here. */
export class RunStore {
  private directory: string;
  constructor(directory: string) {
    this.directory = directory;
  }

  private path(id: string) {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid run ID");
    return join(this.directory, `${id}.json`);
  }

  async read(id: string): Promise<AgentRun | null> {
    try {
      return JSON.parse(await readFile(this.path(id), "utf8")) as AgentRun;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  private async save(run: AgentRun) {
    await mkdir(this.directory, { recursive: true });
    const target = this.path(run.id);
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(run, null, 2), { mode: 0o600 });
    await rename(temporary, target);
    return run;
  }

  async create(
    taskId: string,
    agent: AgentRun["agent"],
    options: {
      useGraphify?: boolean;
      codeMode?: boolean;
      id?: string;
      title?: string;
      brief?: string;
      enabled?: string[];
    } = {},
  ): Promise<AgentRun> {
    if (!taskId.trim()) throw new Error("Task ID required");
    const now = new Date().toISOString();
    return this.save({
      ...options,
      id: options.id ?? randomUUID(),
      taskId,
      agent,
      steps: [],
      status: "queued",
      createdAt: now,
      updatedAt: now,
      events: [
        {
          at: now,
          source: "server",
          message: "Run recorded; not yet sent to a provider.",
        },
      ],
    });
  }

  async list(): Promise<AgentRun[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter((n) =>
      /^[0-9a-f-]{36}\.json$/.test(n),
    );
    const runs = await Promise.all(names.map((n) => this.read(n.slice(0, -5))));
    return runs
      .filter((r): r is AgentRun => r !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
  }
  async recordEvent(id: string, event: Omit<RunEvent, "at">) {
    const run = await this.read(id);
    if (!run || run.status !== "running") throw new Error("Run not running");
    return this.save({
      ...run,
      updatedAt: new Date().toISOString(),
      events: [...run.events, { ...event, at: new Date().toISOString() }],
    });
  }
  async recordStep(id: string, step: RunStep) {
    const run = await this.read(id);
    if (!run || run.status !== "running" || !step.responseId || !step.output)
      throw new Error("Invalid provider evidence");
    return this.save({
      ...run,
      steps: [...(run.steps ?? []), step],
      updatedAt: step.verifiedAt,
      events: [
        ...run.events,
        {
          at: step.verifiedAt,
          source: "provider",
          message: `Respons ${step.agent} diterima`,
          providerResponseId: step.responseId,
        },
      ],
    });
  }
  async recordFiles(
    id: string,
    files: import("./code-workspace.ts").CodeFile[],
  ) {
    const run = await this.read(id);
    if (!run || run.status !== "running") throw new Error("Run not running");
    return this.save({
      ...run,
      files,
      proposalDigest: createHash("sha256")
        .update(JSON.stringify(files))
        .digest("hex"),
    });
  }
  async recordWorkspace(id: string, workspace: string) {
    const run = await this.read(id);
    if (!run || !run.files?.length) throw new Error("Run has no code");
    return this.save({ ...run, workspace });
  }
  async recordTest(
    id: string,
    testResult: import("./test-runner.ts").TestResult,
  ) {
    const run = await this.read(id);
    if (!run) throw new Error("Run not found");
    return this.save({
      ...run,
      testResult,
      events: [
        ...run.events,
        {
          at: testResult.at,
          source: "server",
          message: `Tes container: ${testResult.status}; exit code ${testResult.exitCode}`,
        },
      ],
    });
  }
  /** The executor must serialize transitions for each run. */
  async transition(
    id: string,
    status: RunStatus,
    event: Omit<RunEvent, "at">,
    result?: { output?: string; error?: string },
  ) {
    const run = await this.read(id);
    if (!run) throw new Error("Run not found");
    const allowed: Record<RunStatus, RunStatus[]> = {
      queued: ["running", "failed"],
      running: ["completed", "failed"],
      completed: [],
      failed: [],
    };
    if (!allowed[run.status].includes(status))
      throw new Error(`Invalid transition: ${run.status} → ${status}`);
    if (
      status === "completed" &&
      (event.source !== "provider" ||
        !event.providerResponseId ||
        !result?.output?.trim())
    ) {
      throw new Error("Completion requires a provider response ID and output");
    }
    const now = new Date().toISOString();
    return this.save({
      ...run,
      ...result,
      status,
      updatedAt: now,
      events: [...run.events, { ...event, at: now }],
    });
  }
}
