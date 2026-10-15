/**
 * The Preview's "Checking this shape…" is BOUNDED (2026-10-14): a schema read
 * that never answers ends in a named timeout with Try again, which re-asks the
 * registry — it never sits forever and never turns into "no schema".
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const retrySchema = jest.fn((_kind: string) => {});
const refresh = jest.fn(async (_ms: number) => {});

// "hung": the schema read never answers. "answered": it answers at once —
// while the SCREEN still never settles (the 2026-10-14 sandbox-frame case).
let schemaRead: "hung" | "answered" = "hung";
jest.mock("@/features/content-ir/registry/kind-registry", () => ({
  kindRegistry: {
    whenSchemaSettled: () =>
      schemaRead === "hung" ? new Promise(() => {}) : Promise.resolve("loaded"),
    retrySchema: (kind: string) => retrySchema(kind),
  },
}));
jest.mock("@/features/content-ir/registry/component-registry", () => ({
  componentRegistry: {
    ensureWarm: async () => {},
    refresh: (ms: number) => refresh(ms),
  },
}));

import { useBoundedKindCheck, useKindCheckAnswers } from "../use-bounded-kind-check";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: { timedOut: boolean; retry: () => void } | null = null;
function Probe({ settled }: { settled: boolean }) {
  latest = useBoundedKindCheck("hung_kind", settled, 30);
  return null;
}

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  schemaRead = "hung";
  retrySchema.mockClear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it("a schema read that never settles times out, and Try again re-asks and re-arms the wait", async () => {
  act(() => root.render(<Probe settled={false} />));
  expect(latest?.timedOut).toBe(false);
  await act(async () => {
    await wait(80);
  });
  expect(latest?.timedOut).toBe(true);
  act(() => latest?.retry());
  expect(retrySchema).toHaveBeenCalledWith("hung_kind");
  expect(latest?.timedOut).toBe(false);
  await act(async () => {
    await wait(80);
  });
  expect(latest?.timedOut).toBe(true);
});

it("a settled check never reports a timeout", async () => {
  act(() => root.render(<Probe settled={true} />));
  await act(async () => {
    await wait(80);
  });
  expect(latest?.timedOut).toBe(false);
});

it("the registries answering never ends the bound: a screen that stays unsettled still times out", async () => {
  // The defect: the deadline raced the REGISTRY promises, so when they answered
  // but the screen's own `settled` never turned true, "Checking…" was endless.
  schemaRead = "answered";
  act(() => root.render(<Probe settled={false} />));
  await act(async () => {
    await wait(80);
  });
  expect(latest?.timedOut).toBe(true);
});

it("each registry answer moves the counter the screen re-reads with", async () => {
  schemaRead = "answered";
  let answers = -1;
  function Answers() {
    answers = useKindCheckAnswers("some_kind");
    return null;
  }
  act(() => root.render(<Answers />));
  expect(answers).toBe(0);
  await act(async () => {
    await wait(10);
  });
  expect(answers).toBe(1);
});
