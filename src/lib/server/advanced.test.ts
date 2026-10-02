import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { selectAgentTools } from "./agent-tools.ts";
import { createGenerator } from "./openai.ts";
import {
  validateFiles,
  materialize,
  mergeCode,
  codeDigest,
} from "./code-workspace.ts";
import { dockerArguments } from "./test-runner.ts";
import { executeRun } from "./orchestrator.ts";
import { RunStore } from "./run-store.ts";
test("automatic Graphify requires explicit allowlist and read-only metadata", () => {
  const tools = [
    { name: "read", inputSchema: {}, annotations: { readOnlyHint: true } },
    { name: "write", inputSchema: {} },
  ];
  assert.equal(selectAgentTools(tools, ["read"]).length, 1);
  assert.throws(() => selectAgentTools(tools, ["write"]));
  assert.throws(() => selectAgentTools(tools, ["invented"]));
  assert.equal(selectAgentTools(tools, []).length, 0);
});
test("OpenAI tool bridge uses call_id and returns actual tool output, no unauthorized execution", async () => {
  const prior = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture";
  let requests = 0,
    calls = 0;
  try {
    const generate = createGenerator(
      "alpha",
      async (_u, init) => {
        requests++;
        const body = JSON.parse(String(init?.body));
        if (requests === 1)
          return Response.json({
            status: "completed",
            id: "r1",
            output: [
              {
                type: "function_call",
                call_id: "c1",
                name: "graphify_0",
                arguments: '{"q":"sample"}',
              },
            ],
          });
        assert.ok(
          body.input.some(
            (x: any) =>
              x.type === "function_call_output" &&
              x.call_id === "c1" &&
              x.output.includes("real-fixture"),
          ),
        );
        return Response.json({
          status: "completed",
          id: "r2",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "answer" }],
            },
          ],
        });
      },
      [
        {
          name: "graphify_0",
          description: "read",
          parameters: { type: "object" },
          execute: async (args) => {
            calls++;
            assert.equal(args.q, "sample");
            return { data: "real-fixture" };
          },
        },
      ],
    );
    const result = await generate("i", "x");
    assert.equal(result.text, "answer");
    assert.equal(calls, 1);
    assert.deepEqual(result.requestIds, ["r1", "r2"]);
    const rogue = createGenerator("alpha", async () =>
      Response.json({
        status: "completed",
        id: "r3",
        output: [
          {
            type: "function_call",
            call_id: "bad",
            name: "shell",
            arguments: "{}",
          },
        ],
      }),
    );
    await assert.rejects(() => rogue("i", "x"), /tidak diizinkan/);
  } finally {
    if (prior === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prior;
  }
});
test("code paths cannot escape or overwrite duplicate files; Delta can only add tests", () => {
  for (const path of [
    "../x.mjs",
    "/x.mjs",
    "a/../../x.mjs",
    ".env",
    "a/.git/config",
    "node_modules/x.js",
    "a/./x.js",
    "a\\x.js",
  ])
    assert.throws(() => validateFiles([{ path, content: "x" }]));
  assert.throws(() =>
    mergeCode([
      [{ path: "a.mjs", content: "a" }],
      [{ path: "a.mjs", content: "b" }],
    ]),
  );
  assert.throws(() => validateFiles([{ path: "app.mjs", content: "x" }], true));
});
test("code is materialized as reviewed, digest checked, and readable by container user", async () => {
  const root = await mkdtemp(join(tmpdir(), "astra-files-"));
  try {
    const id = randomUUID();
    const files = [
      { path: "src/add.mjs", content: "export const add=(a,b)=>a+b;" },
    ];
    const saved = await materialize(root, id, files);
    assert.equal(
      await readFile(join(saved.path, "src/add.mjs"), "utf8"),
      files[0].content,
    );
    assert.equal(saved.hash, codeDigest(files));
    assert.equal((await materialize(root, id, files)).reused, true);
    await assert.rejects(() =>
      materialize(root, id, [{ ...files[0], content: "changed" }]),
    );
    assert.ok((await stat(join(saved.path, "src/add.mjs"))).mode & 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("Docker tests use a fixed isolated command, no shell, credentials or network", () => {
  const args = dockerArguments(
    "/tmp/reviewed",
    ["tests/add.test.mjs"],
    "test-name",
  );
  assert.ok(args.includes("--network=none"));
  assert.ok(args.includes("--read-only"));
  assert.ok(args.includes("--cap-drop=ALL"));
  assert.ok(args.includes("--pull=never"));
  assert.ok(args.includes("--user=65534:65534"));
  assert.equal(args.at(-1), "tests/add.test.mjs");
  assert.throws(() => dockerArguments("/tmp/x", ["../secret.test.mjs"], "x"));
  assert.throws(() => dockerArguments("/tmp/x", [], "x"));
});
test("code mode ensures Rodeo and Delta, preserves file evidence and provider status", async () => {
  const dir = await mkdtemp(join(tmpdir(), "astra-code-"));
  try {
    const store = new RunStore(dir);
    const run = await store.create("t", "astra", {
      title: "Add",
      brief: "Make add",
      enabled: ["astra", "alpha", "rodeo", "delta"],
      codeMode: true,
    });
    await executeRun(store, run, (agent) => async () => ({
      id: `fixture-${agent}`,
      model: "fixture",
      text:
        agent === "astra"
          ? '{"assignments":[{"agent":"alpha","brief":"analyze"}]}'
          : agent === "alpha"
            ? "Requirements"
            : JSON.stringify({
                summary: "proposal",
                files: [
                  {
                    path: agent === "rodeo" ? "add.mjs" : "add.test.mjs",
                    content:
                      agent === "rodeo"
                        ? "export const add=(a,b)=>a+b;"
                        : "import{test}from'node:test';import assert from'node:assert/strict';import{add}from'./add.mjs';test('add',()=>assert.equal(add(1,2),3));",
                  },
                ],
              }),
    }));
    const saved = await store.read(run.id);
    assert.equal(saved?.status, "completed");
    assert.equal(saved?.files?.length, 2);
    assert.equal(saved?.proposalDigest, codeDigest(saved!.files!));
    assert.equal(saved?.testResult, undefined);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
