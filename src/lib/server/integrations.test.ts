import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGenerator } from "./openai.ts";
import { GraphifyClient } from "./graphify.ts";
import { parsePlan, executeRun } from "./orchestrator.ts";
import { RunStore } from "./run-store.ts";
import { guardLocal, readBody } from "./http.ts";
test("OpenAI uses server credentials, structured format, and verified output only", async () => {
  const prior = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    const generate = createGenerator("astra", async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.text.format.type, "json_schema");
      return Response.json({
        id: "resp-test",
        status: "completed",
        model: "fixture-model",
        output: [
          { type: "reasoning" },
          { type: "message", content: [{ type: "output_text", text: "ok" }] },
        ],
      });
    });
    assert.equal(
      (await generate("instructions", "input", { type: "object" })).text,
      "ok",
    );
    await assert.rejects(
      () =>
        createGenerator("alpha", async () =>
          Response.json({ id: "resp-test", status: "incomplete", output: [] }),
        )("i", "x"),
      /belum lengkap/,
    );
    await assert.rejects(
      () =>
        createGenerator(
          "alpha",
          async () => new Response("SECRET-test-key", { status: 401 }),
        )("i", "x"),
      (e) =>
        e instanceof Error &&
        e.message.includes("401") &&
        !e.message.includes("test-key"),
    );
  } finally {
    if (prior === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prior;
  }
});
test("Astra plan rejects disabled, repeated, or invented agents", () => {
  for (const assignments of [
    [{ agent: "delta", brief: "QA" }],
    [
      { agent: "alpha", brief: "A" },
      { agent: "alpha", brief: "B" },
    ],
    [{ agent: "shell", brief: "x" }],
    [],
  ])
    assert.throws(() => parsePlan(JSON.stringify({ assignments }), ["alpha"]));
  assert.equal(
    parsePlan('{"assignments":[{"agent":"alpha","brief":"Analyze"}]}', [
      "alpha",
    ]).length,
    1,
  );
});
test("orchestration delegates automatically and persists provider evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "astra-orch-"));
  try {
    const store = new RunStore(dir);
    const run = await store.create("t", "astra", {
      title: "Fixture",
      brief: "Build a function",
      enabled: ["astra", "alpha", "rodeo", "delta"],
    });
    const calls: string[] = [];
    await executeRun(store, run, (agent) => async (_i, input) => {
      calls.push(agent);
      if (agent === "astra")
        return {
          id: "r1",
          model: "fixture",
          text: JSON.stringify({
            assignments: [
              { agent: "alpha", brief: "analyze" },
              { agent: "rodeo", brief: "code" },
              { agent: "delta", brief: "review" },
            ],
          }),
        };
      if (agent === "delta") assert.ok(input.includes("rodeo"));
      return { id: `r-${agent}`, model: "fixture", text: `${agent} output` };
    });
    const saved = await store.read(run.id);
    assert.equal(saved?.status, "completed");
    assert.equal(saved?.steps?.length, 4);
    assert.deepEqual(calls, ["astra", "alpha", "rodeo", "delta"]);
    assert.equal(saved?.events.at(-1)?.source, "provider");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("failure preserves partial results and stops further calls", async () => {
  const dir = await mkdtemp(join(tmpdir(), "astra-fail-"));
  try {
    const store = new RunStore(dir);
    const run = await store.create("t", "astra", {
      enabled: ["astra", "alpha", "rodeo"],
    });
    const calls: string[] = [];
    await executeRun(store, run, (agent) => async () => {
      calls.push(agent);
      if (agent === "astra")
        return {
          id: "plan",
          model: "fixture",
          text: '{"assignments":[{"agent":"alpha","brief":"a"},{"agent":"rodeo","brief":"b"}]}',
        };
      throw new Error("fixture provider failure");
    });
    const saved = await store.read(run.id);
    assert.equal(saved?.status, "failed");
    assert.equal(saved?.steps?.length, 1);
    assert.deepEqual(calls, ["astra", "alpha"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("MCP initializes session, reads SSE tool pagination and sends explicit tool call", async () => {
  const methods: string[] = [];
  const client = new GraphifyClient(
    "https://api.graphify.com/mcp",
    "fixture-token",
    async (_url, init) => {
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      const message = JSON.parse(String(init?.body));
      methods.push(message.method);
      const headers = init?.headers as Record<string, string>;
      if (message.method !== "initialize")
        assert.equal(headers["Mcp-Session-Id"], "session-1");
      if (message.method === "initialize")
        return Response.json(
          {
            jsonrpc: "2.0",
            id: message.id,
            result: { protocolVersion: "2025-03-26" },
          },
          { headers: { "mcp-session-id": "session-1" } },
        );
      if (message.method === "notifications/initialized")
        return new Response(null, { status: 202 });
      const result =
        message.method === "tools/list"
          ? { tools: [{ name: "lookup", inputSchema: { type: "object" } }] }
          : { content: [{ type: "text", text: "fixture" }] };
      return new Response(
        `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n\n`,
        { headers: { "content-type": "text/event-stream" } },
      );
    },
  );
  const result = await client.call("lookup", { q: "test" });
  assert.equal(result.content[0].text, "fixture");
  assert.deepEqual(methods, [
    "initialize",
    "notifications/initialized",
    "tools/list",
    "tools/call",
  ]);
  await client.close();
});
test("MCP auth failure is not reported as connected; unknown tool cannot be executed", async () => {
  const denied = new GraphifyClient(
    "https://api.graphify.com/mcp",
    "",
    async () => new Response(null, { status: 401 }),
  );
  await assert.rejects(() => denied.listTools(), /401/);
  const c = new GraphifyClient(
    "https://api.graphify.com/mcp",
    "",
    async (_u, init) => {
      const m = JSON.parse(String(init?.body));
      if (m.method === "notifications/initialized")
        return new Response(null, { status: 202 });
      assert.notEqual(m.method, "tools/call");
      return Response.json({
        id: m.id,
        result:
          m.method === "initialize"
            ? { protocolVersion: "2025-03-26" }
            : { tools: [] },
      });
    },
  );
  await assert.rejects(() => c.call("invented", {}), /tidak tersedia/);
});
test("local API rejects cross-origin, remote hosts and oversized input", async () => {
  assert.throws(() =>
    guardLocal(
      new Request("http://localhost:3000/api/runs", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    ),
  );
  assert.throws(() => guardLocal(new Request("http://evil.example/api/runs")));
  assert.doesNotThrow(() =>
    guardLocal(
      new Request("http://127.0.0.1:3000/api/runs", {
        method: "POST",
        headers: { origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  await assert.rejects(
    () =>
      readBody(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: "a".repeat(33000) }),
        }),
      ),
    /besar/,
  );
});
