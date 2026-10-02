import {
  mkdir,
  writeFile,
  readFile,
  rename,
  rm,
  lstat,
  readdir,
} from "node:fs/promises";
import { join, posix } from "node:path";
import { createHash, randomUUID } from "node:crypto";
export type CodeFile = { path: string; content: string };
export const codeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    files: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  required: ["summary", "files"],
};
export function validateFiles(value: unknown, testsOnly = false): CodeFile[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20)
    throw new Error("Harus ada 1–20 berkas.");
  let bytes = 0;
  const seen = new Set<string>();
  for (const f of value) {
    if (
      !f ||
      typeof f.path !== "string" ||
      typeof f.content !== "string" ||
      f.path.length > 160 ||
      !f.path.match(/^[A-Za-z0-9_][A-Za-z0-9_./-]*$/) ||
      posix.normalize(f.path) !== f.path ||
      f.path
        .split("/")
        .some(
          (s: string) =>
            s === ".." || s.startsWith(".") || s === "node_modules",
        ) ||
      !f.path.match(/\.(m?js|cjs|ts|tsx|json|md|css|html)$/i) ||
      seen.has(f.path.toLowerCase())
    )
      throw new Error("Path berkas tidak aman / duplikat.");
    if (testsOnly && !/\.test\.mjs$/.test(f.path))
      throw new Error("Delta hanya boleh menambah berkas .test.mjs.");
    seen.add(f.path.toLowerCase());
    bytes += Buffer.byteLength(f.content);
  }
  if (bytes > 150000) throw new Error("Berkas melebihi batas ukuran.");
  return value;
}
export function parseCode(
  text: string,
  testsOnly = false,
): { summary: string; files: CodeFile[] } {
  const result = JSON.parse(text);
  if (typeof result.summary !== "string")
    throw new Error("Ringkasan perubahan tidak valid.");
  return {
    summary: result.summary,
    files: validateFiles(result.files, testsOnly),
  };
}
export function mergeCode(groups: CodeFile[][]) {
  return validateFiles(groups.flat());
}
export function codeDigest(files: CodeFile[]) {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}
export function workspacePath(root: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Run ID tidak valid.");
  return join(root, id);
}
export async function materialize(root: string, id: string, files: CodeFile[]) {
  validateFiles(files);
  const target = workspacePath(root, id);
  const hash = codeDigest(files);
  await mkdir(root, { recursive: true });
  try {
    const info = await lstat(target);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error("Folder workspace tidak aman.");
    const manifest = JSON.parse(
      await readFile(join(target, ".astra-manifest.json"), "utf8"),
    );
    if (manifest.hash !== hash)
      throw new Error("Folder sudah berisi proposal berbeda.");
    const expected = new Set([
      ...files.map((f) => f.path),
      ".astra-manifest.json",
    ]);
    async function checkTree(dir: string, prefix = ""): Promise<void> {
      for (const name of await readdir(dir)) {
        const rel = prefix + name;
        const info = await lstat(join(dir, name));
        if (info.isSymbolicLink())
          throw new Error("Symlink tidak diizinkan di workspace.");
        if (info.isDirectory()) await checkTree(join(dir, name), rel + "/");
        else if (!expected.has(rel))
          throw new Error("Workspace berisi berkas tambahan di luar proposal.");
      }
    }
    await checkTree(target);
    for (const file of files) {
      const info = await lstat(join(target, file.path));
      if (
        !info.isFile() ||
        info.size !== Buffer.byteLength(file.content) ||
        (await readFile(join(target, file.path), "utf8")) !== file.content
      )
        throw new Error(
          "Berkas telah berubah dari proposal. Buat run baru untuk menguji revisi.",
        );
    }
    return { path: target, hash, reused: true };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const temp = join(root, `.stage-${randomUUID()}`);
  await mkdir(temp, { mode: 0o755 });
  try {
    for (const f of files) {
      const parts = f.path.split("/");
      parts.pop();
      await mkdir(join(temp, ...parts), { recursive: true });
      await writeFile(join(temp, f.path), f.content, {
        flag: "wx",
        mode: 0o644,
      });
    }
    await writeFile(
      join(temp, ".astra-manifest.json"),
      JSON.stringify({ hash, files: files.map((f) => f.path) }),
      { flag: "wx", mode: 0o600 },
    );
    await rename(temp, target);
    return { path: target, hash, reused: false };
  } catch (e) {
    await rm(temp, { recursive: true, force: true });
    throw e;
  }
}
