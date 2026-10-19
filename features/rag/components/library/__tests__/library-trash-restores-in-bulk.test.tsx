/**
 * @jest-environment jsdom
 */
/**
 * THE LIBRARY TRASH IS A REAL LIST (walk-core 2026-10-18): the drawer was a card list with one
 * Restore per card — no search, no sort, no select-all. On the shared table a person ticks the
 * page and restores every item in one press, each through its own door.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const restoreDoc = jest.fn(async (_args?: { p_id: string }) => ({ error: null }));
const restoreFile = jest.fn(async (_id: string) => undefined);
const ROWS = [
  { id: "d1", name: "Pricing notes", source_kind: "file", source_id: "s1", derivation_kind: "initial_extract", total_pages: 1, deleted_at: "2026-10-10T10:00:00Z", deleted_via: null, file_name: null, hidden_chunks: 3 },
  { id: "d2", name: "Board deck", source_kind: "file", source_id: "f2", derivation_kind: "initial_extract", total_pages: 4, deleted_at: "2026-10-11T10:00:00Z", deleted_via: "file_cascade", file_name: "deck.pdf", hidden_chunks: 9 },
];
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/supabase/ragDb", () => ({
  ragDb: () => ({
    rpc: (name: string, args?: { p_id: string }) =>
      name === "fn_list_library_trash"
        ? Promise.resolve({ data: ROWS, error: null })
        : restoreDoc(args),
  }),
}));
jest.mock("@/features/files/api/direct", () => ({ restoreFileDirect: (id: string) => restoreFile(id) }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { LibraryTrashTable } from "../LibraryTrashTable";

let container: HTMLDivElement;
let root: Root;
const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("ticks the page and restores every item through its own door", async () => {
  act(() => root.render(<LibraryTrashTable tableId="t.trash" />));
  await flush();
  expect(container.textContent).toContain("Pricing notes");
  expect(container.textContent).toContain("Board deck");
  expect(container.querySelector('input[type="search"], [role="searchbox"], input[placeholder*="Search"]')).not.toBeNull();

  const selectAll = container.querySelector<HTMLButtonElement>('[aria-label="Select every row on this page"]');
  act(() => selectAll?.click());
  await flush();
  const bulk = [...container.querySelectorAll("button")].find((b) => b.textContent === "Restore 2");
  expect(bulk).toBeDefined();
  await act(async () => bulk?.click());
  await flush();
  expect(restoreDoc).toHaveBeenCalledWith({ p_id: "d1" });
  expect(restoreFile).toHaveBeenCalledWith("f2");
});
