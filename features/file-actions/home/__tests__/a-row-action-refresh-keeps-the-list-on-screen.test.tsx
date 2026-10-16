/**
 * @jest-environment jsdom
 */
// A refresh after a row action (rename, move, copy, trash) updates the list IN PLACE: `loading` stays
// false and the current rows stay, so nothing flashes to skeletons or shifts. Only the first load and a
// change of scope (Trash holds different rows) are "loading".
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { useHomeRows } from "../useHomeRows";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type R = { id: string };
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

it("first load and scope change are loading; reload is not", async () => {
  const seen: Array<{ loading: boolean; ids: string[] }> = [];
  let api!: ReturnType<typeof useHomeRows<R>>;
  let pending = deferred<{ data: R[] }>();
  const loadActive = jest.fn(() => pending.promise);
  const loadTrashed = jest.fn(async () => ({ data: [{ id: "t" }] }));

  function Probe({ scope }: { scope: "all" | "trash" }) {
    api = useHomeRows<R>(scope, loadActive as never, loadTrashed as never);
    seen.push({ loading: api.loading, ids: api.rows.map((r) => r.id) });
    return null;
  }
  const root = createRoot(document.createElement("div"));
  await act(async () => root.render(<Probe scope="all" />));
  expect(api.loading).toBe(true);
  await act(async () => pending.resolve({ data: [{ id: "a" }] }));
  expect(api.loading).toBe(false);
  expect(api.rows.map((r) => r.id)).toEqual(["a"]);

  // A row action refreshes: rows stay, loading never goes true.
  pending = deferred();
  seen.length = 0;
  await act(async () => {
    void api.reload();
  });
  expect(api.loading).toBe(false);
  expect(api.rows.map((r) => r.id)).toEqual(["a"]);
  await act(async () => pending.resolve({ data: [{ id: "a2" }] }));
  expect(api.rows.map((r) => r.id)).toEqual(["a2"]);
  expect(seen.some((s) => s.loading)).toBe(false);

  // Another scope is another list: loading, then its rows.
  await act(async () => root.render(<Probe scope="trash" />));
  expect(api.rows.map((r) => r.id)).toEqual(["t"]);
  expect(api.loading).toBe(false);
  act(() => root.unmount());
});
