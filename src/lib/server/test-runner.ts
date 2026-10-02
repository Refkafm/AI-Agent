import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
export type TestResult = {
  status: "passed" | "failed" | "timeout" | "unavailable";
  exitCode: number | null;
  log: string;
  at: string;
};
export function dockerArguments(
  directory: string,
  files: string[],
  name: string,
) {
  if (
    !files.length ||
    files.some(
      (f) => !/^([A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.test\.mjs$/.test(f),
    )
  )
    throw new Error("Tidak ada daftar tes Node .test.mjs yang valid.");
  const dir = resolve(directory);
  if (dir.includes(","))
    throw new Error("Path workspace tidak boleh mengandung koma.");
  return [
    "run",
    "--rm",
    "--pull=never",
    "--name",
    name,
    "--network=none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=64",
    "--memory=256m",
    "--cpus=1",
    "--user=65534:65534",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=32m",
    "--mount",
    `type=bind,source=${dir},target=/work,readonly`,
    "--workdir",
    "/work",
    "--entrypoint",
    "node",
    "node:22-alpine",
    "--test",
    ...files,
  ];
}
export async function runNodeTests(
  directory: string,
  files: string[],
): Promise<TestResult> {
  const name = `astra-test-${randomUUID()}`;
  const args = dockerArguments(directory, files, name);
  const at = new Date().toISOString();
  const engineError = await new Promise<string | null>((done) => {
    execFile(
      "docker",
      ["info", "--format", "{{.ServerVersion}}"],
      { timeout: 5000, maxBuffer: 64000 },
      (error) => {
        done(
          error
            ? "Docker engine tidak tersedia. Aktifkan Docker sebelum menjalankan tes."
            : null,
        );
      },
    );
  });
  if (engineError)
    return { status: "unavailable", exitCode: null, log: engineError, at };
  return new Promise((resolveResult) => {
    let log = "",
      timedOut = false,
      settled = false;
    const child = spawn("docker", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    const stopContainer = () => {
      const cleanup = spawn("docker", ["rm", "-f", name], {
        stdio: "ignore",
        shell: false,
      });
      cleanup.on("error", () => {});
      setTimeout(() => cleanup.kill("SIGKILL"), 5000).unref();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      stopContainer();
    }, 30000);
    function finish(status: TestResult["status"], exitCode: number | null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult({ status, exitCode, log, at });
    }
    const append = (chunk: Buffer) => {
      log += chunk.toString();
      if (Buffer.byteLength(log) > 64000) {
        log = log.slice(0, 60000) + "\nOutput dibatasi.";
        timedOut = true;
        child.kill("SIGKILL");
        stopContainer();
      }
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", () => {
      log =
        "Docker tidak tersedia. Aktifkan Docker dan siapkan image node:22-alpine.";
      finish("unavailable", null);
    });
    child.on("close", (code) =>
      finish(
        timedOut
          ? "timeout"
          : code === 0
            ? "passed"
            : code === 125 || code === 126 || code === 127
              ? "unavailable"
              : "failed",
        code,
      ),
    );
  });
}
