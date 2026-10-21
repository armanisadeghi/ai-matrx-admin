/** Ticked Gmail results take the same changes the open message does; a message already in that state is skipped and named. */
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/features/trash/service", () => ({ archiveRecord: jest.fn(), restoreFromTrash: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagApi", () => ({ fileUnderTag: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagPickerOpener", () => ({ pickTag: jest.fn() }));
jest.mock("@/features/scopes/homes/homePickerOpener", () => ({ pickHome: jest.fn() }));
jest.mock("@/features/scopes/homes/setHome", () => ({ setHome: jest.fn(), resolveHomeScopeId: jest.fn() }));
jest.mock("@/features/sharing/bulk/shareWithPeopleOpener", () => ({ shareWithPeople: jest.fn() }));
const modify = jest.fn(async (input: { messageId: string; action: string }) => ({ message_id: input.messageId, label_ids: ["X"] }));
jest.mock("@/features/marketing/google/service", () => ({ modifyGmailMessage: (i: never) => modify(i) }));

import { gmailBulkActions, gmailSkip } from "../gmailBulkActions";
import type { GmailMessageSummary } from "@/features/marketing/google/types";
import type { EntityBulkSelection } from "@/lib/entity-list/selection";

const msg = (id: string, label_ids?: string[]): GmailMessageSummary => ({
  id, label_ids, thread_id: null, subject: `S${id}`, from_address: "a@b.c", to_address: "d@e.f", date: "", snippet: "",
});
const sel = (rows: GmailMessageSummary[]): EntityBulkSelection<GmailMessageSummary> => ({
  mode: "ids", ids: rows.map((r) => r.id), rows, count: rows.length,
  filter: { scope: { kind: "all" }, orgId: null, search: "", deep: false, archived: "active", filters: {} },
});

beforeEach(() => jest.clearAllMocks());

it("skips messages already in the wanted state and runs the rest through modifyGmailMessage", async () => {
  const changed = jest.fn();
  const archive = gmailBulkActions("conn-1", changed).find((a) => a.id === "archive")!;
  await archive.run(sel([msg("1", ["INBOX", "UNREAD"]), msg("2", ["UNREAD"]), msg("3")]));
  expect(modify.mock.calls.map((c) => c[0].messageId).sort()).toEqual(["1", "3"]);
  expect(changed).toHaveBeenCalledWith("1", ["X"]);
  expect(JSON.stringify(warning.mock.calls)).toContain("S2");
});

it("reads the label that each action flips", () => {
  expect(gmailSkip("mark_read", msg("1", ["INBOX"]))).toBe("Already read");
  expect(gmailSkip("mark_unread", msg("1", ["INBOX"]))).toBeNull();
  expect(gmailSkip("star", msg("1", ["STARRED"]))).toBe("Already starred");
});
