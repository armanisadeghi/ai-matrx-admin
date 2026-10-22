/**
 * `archiveChoice` — the service door every archive of a pick-list choice goes through (the Choices
 * editor, the List Manager window and the agent's `delete_list_items`). Runs the REAL service with
 * only the list read and the records client stubbed.
 *
 * Breaks if the store's `recordDelete` — which archives ANY record the seat may admin — is called
 * with an id that the list, as stored right now, does not hold.
 */

const deletes: string[] = [];
const LIST = {
  list_id: "list-1",
  list_name: "Visit reasons",
  organization_id: "org-1",
  items_grouped: { Routine: [{ id: "c1", label: "Cleaning", description: null, help_text: null }] },
};

jest.mock("@/utils/supabase/client", () => {
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) } };
  return { supabase: client, createClient: () => client };
});
jest.mock("@ai-matrx/records-ui/data-source", () => ({ personActor: () => ({}), recordsDataSource: () => ({}) }));
jest.mock("@ai-matrx/records/core", () => ({
  createRecordsClient: () => ({
    recordDelete: async ({ record_id }: { record_id: string }) => {
      deletes.push(record_id);
      return { ok: true, data: "2026-10-22T00:00:00Z" };
    },
  }),
}));
jest.mock("../doors", () => ({
  readPickList: async () => LIST,
  readPickListForSelection: async () => null,
  rewritePickList: async () => null,
}));
jest.mock("../where-lists-live", () => ({ accessiblePickLists: async () => [] }));
jest.mock("@/lib/records/record-versions", () => ({
  VersionLedger: class {
    drew() {}
    async seen() {
      return null;
    }
    wrote() {}
  },
  updateRecordAt: jest.fn(),
}));

import { archiveChoice } from "../service";

beforeEach(() => {
  deletes.length = 0;
});

it("archives a choice the list holds", async () => {
  await archiveChoice("list-1", "c1");
  expect(deletes).toEqual(["c1"]);
});

it("refuses an id the list does not hold, before anything is archived", async () => {
  await expect(archiveChoice("list-1", "a-record-from-another-table")).rejects.toThrow(
    /is not a choice of this list, so nothing was archived/,
  );
  expect(deletes).toEqual([]);
});
