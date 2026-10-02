import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const checks = [];
checks.push([
  "Node 22.18+",
  Number(process.versions.node.split(".")[0]) > 22 ||
    (Number(process.versions.node.split(".")[0]) === 22 &&
      Number(process.versions.node.split(".")[1]) >= 18),
]);
checks.push([
  "Dependensi Next.js + Three.js",
  [
    "next",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "tailwindcss",
  ].every((p) => existsSync(resolve("node_modules", p, "package.json"))),
]);
checks.push(["OPENAI_API_KEY tersedia", Boolean(process.env.OPENAI_API_KEY)]);
checks.push([
  "Graphify URL dikonfigurasi",
  Boolean(process.env.GRAPHIFY_MCP_URL),
]);
checks.push([
  "Docker engine aktif",
  spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    timeout: 5000,
  }).status === 0,
]);
checks.push([
  "Image tes node:22-alpine tersedia",
  spawnSync("docker", ["image", "inspect", "node:22-alpine"], {
    encoding: "utf8",
    timeout: 5000,
  }).status === 0,
]);
try {
  await lookup("registry.npmjs.org");
  checks.push(["DNS registry npm", true]);
} catch {
  checks.push(["DNS registry npm", false]);
}
for (const [name, ok] of checks)
  console.log(`${ok ? "PASS" : "MISSING"}  ${name}`);
console.log(
  "Nilai kredensial tidak dicetak. PASS pada key/URL hanya berarti konfigurasi tersedia, bukan koneksi live terverifikasi.",
);
if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
