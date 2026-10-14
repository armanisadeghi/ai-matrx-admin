/**
 * The Preview's "Checking this shape…" is BOUNDED (2026-10-14): a schema read
 * that never answers ends in a named timeout with Try again, which re-asks the
 * registry — it never sits forever and never turns into "no schema".
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const retrySchema = jest.fn();
const refresh = jest.fn(async (_ms: number) => {});

jest.mock("@/features/content-ir/registry/kind-registry", () => ({
  kindRegistry: {
    whenSchemaSettled: () => new Promise(() => {}),
    retrySchema: (kind: string) => retrySchema(kind),
  },
}));
jest.mock("@/features/content-ir/registry/component-registry", () => ({
  componentRegistry: {
    ensureWarm: async () => {},
    refresh: (ms: number) => refresh(ms),
  },
}));

import { useBoundedKindCheck } from "../use-bounded-kind-check";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latest: { timedOut: boolean; retry: () => void } | null = null;
function Probe({ settled }: { settled: boolean }) {
  latest = useBoundedKindCheck("hung_kind", settled, 30);
  return null;
}

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
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
