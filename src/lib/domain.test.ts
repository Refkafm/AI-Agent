import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore Node strips TypeScript for these dependency-free domain tests.
import { assignTask, initialState, validState } from "./domain.ts";
test("accept valid storage and reject corrupt task status", () => {
  assert.equal(validState(initialState), true);
  assert.equal(
    validState({
      ...initialState,
      tasks: [{ ...initialState.tasks[0], status: "fake-live" }],
    }),
    false,
  );
});
test("cannot assign to disabled agent", () => {
  assert.throws(() =>
    assignTask(
      initialState.tasks[0],
      "rodeo",
      initialState.agents.map((a) => ({ ...a, enabled: false })),
    ),
  );
  assert.equal(
    assignTask(initialState.tasks[0], "delta", initialState.agents).agent,
    "delta",
  );
});

test("reject null records without throwing", () => {
  assert.equal(validState({ ...initialState, tasks: [null] }), false);
  assert.equal(
    validState({ ...initialState, agents: [null, null, null, null] }),
    false,
  );
  assert.equal(validState({ ...initialState, activities: [null] }), false);
});
