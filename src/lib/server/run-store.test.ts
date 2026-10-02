import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-ignore Node executes TypeScript directly.
import { RunStore } from "./run-store.ts";
test("run persists and completion requires provider evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "astra-runs-"));
  try {
    const store = new RunStore(dir);
    const run = await store.create("task-1", "alpha");
    assert.equal((await new RunStore(dir).read(run.id))?.status, "queued");
    await assert.rejects(() =>
      store.transition(run.id, "completed", {
        source: "server",
        message: "fake completion",
      }),
    );
    await store.transition(run.id, "running", {
      source: "server",
      message: "Sending request",
    });
    await assert.rejects(() =>
      store.transition(
        run.id,
        "completed",
        { source: "server", message: "timer finished" },
        { output: "fake" },
      ),
    );
    const completed = await store.transition(
      run.id,
      "completed",
      {
        source: "provider",
        message: "Response received",
        providerResponseId: "test-response",
      },
      { output: "Fixture output" },
    );
    assert.equal(completed.status, "completed");
    await assert.rejects(() =>
      store.transition(run.id, "running", {
        source: "server",
        message: "restart",
      }),
    );
    await assert.rejects(() => store.read("../secret"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
