/**
 * FT2 (2026-10-22): /trash's Recent overview took counts + rows in SERIES for a person with ~27k archived
 * items (trash_counts ~1-5 s, then trash_list(null) ~1 s). The rows never needed the counts: only another
 * source (the CMS) waits to learn whether it holds anything. RED on the old TrashList: with the counts
 * still pending, no trash_list call was made and no row showed.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ supabase: { rpc, schema: () => ({ rpc }) } }));
jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }));

import { TrashList } from "../components/TrashList";

const NOTE = {
  artifact_kind: "note",
  entity_token: "note",
  label: "Note",
  id: "11111111-1111-4111-8111-111111111111",
  title: "Spring aeration checklist",
  deleted_at: "2026-09-20T15:00:00Z",
  organization_id: "",
  is_mine: true,
};

let container: HTMLDivElement;
let root: Root;
const fetchMock = jest.fn();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  rpc.mockReset();
  // The counts never answer during this test; the rows must not wait for them.
  rpc.mockImplementation((fn: string) =>
    fn === "trash_counts" ? new Promise(() => {}) : Promise.resolve({ data: [NOTE], error: null }),
  );
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => new Promise(() => {}));
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("the Recent overview asks for its rows while the counts are still loading", async () => {
  await act(async () => {
    root.render(<TrashList scope={{ mode: "personal" }} />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(rpc).toHaveBeenCalledWith("trash_list", expect.objectContaining({ p_kinds: undefined, p_offset: 0 }));
  expect(container.querySelector(`li[data-trash-id="${NOTE.id}"]`)).not.toBeNull();
});
