import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
test("run API end-to-end with fixture OpenAI: evidence, replay protection, origin and validation", async () => {
  const cwd = process.cwd(),
    dir = await mkdtemp(join(tmpdir(), "astra-api-")),
    previousKey = process.env.OPENAI_API_KEY,
    previousFetch = globalThis.fetch;
  process.chdir(dir);
  process.env.OPENAI_API_KEY = "fixture-only";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({
      id: `fixture-response-${calls}`,
      status: "completed",
      model: "fixture",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Static proposal, not executed code.",
            },
          ],
        },
      ],
    });
  };
  try {
    const { POST, GET } = await import("../../app/api/runs/route.ts");
    const payload = {
      id: randomUUID(),
      taskId: "task-fixture",
      title: "Fixture",
      brief: "Analyze only",
      agent: "alpha",
      enabled: ["alpha"],
    };
    const make = (body: unknown, origin = "http://localhost:3000") =>
      new Request("http://localhost:3000/api/runs", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await POST(make(payload, "https://external.example"))).status,
      403,
    );
    assert.equal((await POST(make({ ...payload, enabled: [] }))).status, 400);
    const response = await POST(make(payload));
    assert.equal(response.status, 200);
    const { run } = await response.json();
    assert.equal(run.status, "completed");
    assert.equal(run.steps[0].responseId, "fixture-response-1");
    const replay = await POST(make(payload));
    assert.equal((await replay.json()).reused, true);
    assert.equal(calls, 1);
    const read = await GET(new Request("http://localhost:3000/api/runs"));
    assert.equal((await read.json()).runs.length, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});
