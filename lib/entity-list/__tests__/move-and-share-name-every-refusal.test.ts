// The built-in "Move to…" and "Share…" bulk verbs run per row through the
// platform's one door each (`platform.set_home`, `share_resource_with_user`)
// and never swallow a refusal: a version conflict and a `{success:false}`
// answer are each skipped and named with the database's own sentence.

const rpcCalls: { schema: string | null; fn: string; args: Record<string, unknown> }[] = [];
let answer: (schema: string | null, fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown };

jest.mock("@/utils/supabase/client", () => {
  const call = (schema: string | null) => (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ schema, fn, args });
    return Promise.resolve(answer(schema, fn, args));
  };
  return { supabase: { rpc: call(null), schema: (name: string) => ({ rpc: call(name) }) } };
});
const warning = jest.fn();
jest.mock("@/lib/toast", () => ({ toast: { warning: (...a: unknown[]) => warning(...a), success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/trash/service", () => ({ archiveRecord: jest.fn() }));
jest.mock("@/features/knowledge/hub/tags/tagApi", () => ({ fileUnderTag: jest.fn() }));
jest.mock("@/components/dialogs/value-prompts/valuePromptsOpener", () => ({ promptForValues: jest.fn() }));
jest.mock("@/lib/organizations/activeOrg", () => ({ getActiveOrgId: () => "org-active" }));

import {
  moveSelectionToHome,
  shareSelectionWithPerson,
  standardBulkActionsFor,
} from "../standardBulkActions";
import type { EntityBulkSelection } from "../selection";

interface Row {
  id: string;
  name: string;
  version: number;
  organization_id: string;
}

const rows: Row[] = [
  { id: "a1", name: "Intake triage", version: 3, organization_id: "org-1" },
  { id: "a2", name: "Contract reviewer", version: 7, organization_id: "org-1" },
];
const selection: EntityBulkSelection<Row> = {
  mode: "ids",
  ids: rows.map((r) => r.id),
  rows,
  count: rows.length,
  filter: {} as EntityBulkSelection<Row>["filter"],
};
const args = { token: "agent", noun: "agent", rowIdOf: (r: Row) => r.id, labelOf: (r: Row) => r.name };

beforeEach(() => {
  rpcCalls.length = 0;
  warning.mockReset();
  (globalThis as { fetch?: unknown }).fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

describe("Move to… (platform.set_home per row)", () => {
  it("sends each row's own version and names the row a version conflict refused", async () => {
    answer = (_s, _fn, a) =>
      a.p_entity_id === "a2"
        ? { data: null, error: { code: "40001", message: "This was changed somewhere else. Reload it and move it again." } }
        : {
            data: { home_scope_id: "s-9", organization_id: "org-2", organization_changed: true, version: 4, kept_fields: [], unchanged: false },
            error: null,
          };

    const result = await moveSelectionToHome(selection, { scopeId: "s-9", label: "Northwind" }, args);

    expect(rpcCalls.map((c) => [c.schema, c.fn, c.args.p_entity_id, c.args.p_expected_version])).toEqual([
      ["platform", "set_home", "a1", 3],
      ["platform", "set_home", "a2", 7],
    ]);
    expect(result.message).toBe("Moved to Northwind: 1 agent.");
    expect(warning).toHaveBeenCalledWith("1 agent skipped", {
      description: "Contract reviewer: This was changed somewhere else. Reload it and move it again.",
    });
  });

  it("throws (keeping the selection) with every refusal named when nothing moved", async () => {
    answer = () => ({ data: null, error: { code: "22023", message: "agent records do not have homes yet." } });
    await expect(moveSelectionToHome(selection, { scopeId: "s-9", label: "Northwind" }, args)).rejects.toThrow(
      "None done. 2 agents skipped — Intake triage: agent records do not have homes yet. · Contract reviewer: agent records do not have homes yet.",
    );
  });
});

describe("Share… (share_resource_with_user per row)", () => {
  it("a {success:false} answer is a named refusal, never a success", async () => {
    answer = (_s, fn, a) =>
      fn === "share_resource_with_user" && a.p_resource_id === "a1"
        ? { data: { success: false, error: "Only the owner can share this." }, error: null }
        : { data: { success: true, outcome: "shared" }, error: null };

    const result = await shareSelectionWithPerson(selection, "user-7", "viewer", args);

    expect(rpcCalls.filter((c) => c.fn === "share_resource_with_user").map((c) => c.args.p_resource_id)).toEqual(["a1", "a2"]);
    expect(result).toEqual({ success: true, message: "Shared: 1 agent." });
    expect(warning).toHaveBeenCalledWith("1 agent skipped", { description: "Intake triage: Only the owner can share this." });
  });

  it("answers {success:false} with the names when every row refused", async () => {
    answer = () => ({ data: { success: false, error: "That person is not in this organization." }, error: null });
    const result = await shareSelectionWithPerson(selection, "user-7", "editor", args);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Intake triage: That person is not in this organization.");
    expect(result.error).toContain("Contract reviewer: That person is not in this organization.");
  });

  it("a record type with no share registry row is refused by name, before any call", async () => {
    const result = await shareSelectionWithPerson(selection, "user-7", "viewer", { ...args, token: "not_a_shareable_type", noun: "widget" });
    expect(result).toEqual({ success: false, error: "widget records cannot be shared from a list yet." });
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("the built-in set", () => {
  it("reads Favorite · Unfavorite · Add tag · Move to… · Share… · Move to Trash, each switchable off", () => {
    const labels = (config: Parameters<typeof standardBulkActionsFor<Row>>[0]["config"]) =>
      standardBulkActionsFor<Row>({ ...args, config }).map((a) => a.label);
    expect(labels(undefined)).toEqual(["Favorite", "Unfavorite", "Add tag", "Move to…", "Share…", "Move to Trash"]);
    expect(labels({ move: false, share: false })).toEqual(["Favorite", "Unfavorite", "Add tag", "Move to Trash"]);
    expect(labels(false)).toEqual([]);
  });
});
