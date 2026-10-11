/**
 * Item homes — the one move path and the home tree's organization rule.
 * Red before (folders): a move wrote folder_id optimistically and refused any
 * cross-organization target; the sidebar printed organization badges on folders.
 */
import { configureStore } from "@reduxjs/toolkit";

const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema: (name: string) => ({ rpc: (fn: string, args: unknown) => rpc(name, fn, args) }) },
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../redux/thunks", () => ({ saveNote: jest.fn() }));

import { toast } from "@/lib/toast";
import notesReducer, { upsertNoteFromServer } from "../../redux/slice";
import { moveNoteToHome } from "../moveNoteToHome";
import { buildHomes, collidingHomeNames, homeDisplayName } from "../homeModel";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
const GENERAL_A = "10000000-0000-4000-8000-00000000000a";
const CASE_B = "20000000-0000-4000-8000-00000000000b";
const NOTE = "30000000-0000-4000-8000-000000000001";

function storeWithNote() {
  const store = configureStore({
    reducer: { notes: notesReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(
    upsertNoteFromServer({
      note: {
        id: NOTE, organization_id: ORG_A, home_scope_id: GENERAL_A, version: 4,
        label: "Deposition prep", content: "x", created_by: "u1",
      },
      fetchStatus: "list",
    } as never),
  );
  return store;
}

describe("moveNoteToHome", () => {
  beforeEach(() => rpc.mockReset());

  it("moves across organizations through set_home and applies the receipt", async () => {
    const store = storeWithNote();
    rpc.mockResolvedValue({
      data: { home_scope_id: CASE_B, organization_id: ORG_B, organization_changed: true, version: 5, kept_fields: [] },
      error: null,
    });
    const result = await store.dispatch(moveNoteToHome({ noteId: NOTE, scopeId: CASE_B, homeLabel: "Case 1234" })).unwrap();
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("platform", "set_home", {
      p_entity_type: "note", p_entity_id: NOTE, p_scope_id: CASE_B, p_expected_version: 4,
    });
    const note = store.getState().notes.notes[NOTE];
    expect([note.home_scope_id, note.organization_id, note.version]).toEqual([CASE_B, ORG_B, 5]);
    expect(note._dirty).toBe(false);
    expect(toast.success).toHaveBeenCalledWith("Moved to Case 1234");
  });

  it("leaves the note where it was and says the database's reason on refusal", async () => {
    const store = storeWithNote();
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "That home is not available. Choose another home." } });
    const result = await store.dispatch(moveNoteToHome({ noteId: NOTE, scopeId: CASE_B, homeLabel: "Case 1234" })).unwrap();
    expect(result).toEqual({ ok: false, message: "That home is not available. Choose another home." });
    const note = store.getState().notes.notes[NOTE];
    expect([note.home_scope_id, note.organization_id, note.version]).toEqual([GENERAL_A, ORG_A, 4]);
    expect(toast.error).toHaveBeenCalledWith("That home is not available. Choose another home.");
  });
});

describe("home tree labels (organization only where it is the meaning)", () => {
  const homes = buildHomes([
    { id: ORG_A, name: "ABC Legal", scope_types: [
      { id: "ta", slug: "general", label_singular: "General", scopes: [{ id: GENERAL_A, name: "General" }] },
      { id: "tc", slug: "cases", label_singular: "Case", scopes: [{ id: "c1", name: "Smith v. Jones" }] },
    ] },
    { id: ORG_B, name: "Harbor Dental", scope_types: [
      { id: "tb", slug: "general", label_singular: "General", scopes: [{ id: "gb", name: "General" }] },
      { id: "tp", slug: "patients", label_singular: "Patient", scopes: [{ id: "p1", name: "Smith v. Jones" }, { id: "p2", name: "Lee" }] },
    ] },
  ] as never);
  const colliding = collidingHomeNames(homes);
  const label = (id: string, many: boolean) =>
    homeDisplayName(homes.find((h) => h.scopeId === id)!, { notesSpanManyOrganizations: many, collidingNames: colliding });

  it("never names an organization on an ordinary scope or a single-organization General", () => {
    expect(label("p2", true)).toBe("Lee");
    expect(label(GENERAL_A, false)).toBe("General");
  });
  it("names it on a General when notes span organizations, and on same-named scopes", () => {
    expect(label(GENERAL_A, true)).toBe("General · ABC Legal");
    expect(label("c1", false)).toBe("Smith v. Jones · ABC Legal");
  });
});
