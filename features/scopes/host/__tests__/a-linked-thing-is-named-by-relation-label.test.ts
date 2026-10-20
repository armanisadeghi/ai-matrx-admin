/**
 * A LINKED THING IS NAMED BY relation_label, THROUGH ONE PATH (lane LINK-PICKER-2). The row page's "Linked" list said
 * "Untitled Pay period" for a kind the registry gives no title column: the candidate search titles through a title
 * column and came back empty, so every surface that names a linked record (Linked list, attached-items sheet, universal
 * search) fell to "Untitled <kind>". The host's ONE store now asks platform.relation_label (custom.entity_reference_words)
 * for what the candidate search could not title.
 *
 * Breaks each test names:
 * - the store's titles are not wrapped (the wrap removed, or a second un-wrapped service read) -> "the store" red.
 * - an unresolved id still falls to the fallback -> "unresolved" red.
 * - a kind the candidate search titled is asked again, or a `record` id is sent to the label door -> "asked only" red.
 */
const door = jest.fn();
const candidateTitles = new Map<string, string>();
const baseTitles = {
  get: jest.fn((token: string, id: string) => candidateTitles.get(`${token}:${id}`) ?? null),
  prime: jest.fn((token: string, id: string, title: string) => void candidateTitles.set(`${token}:${id}`, title)),
  fallback: (token: string) => `Untitled ${token}`,
  fetch: jest.fn(async (token: string, ids: string[]) => {
    const out = new Map<string, string>();
    for (const id of ids) {
      const hit = candidateTitles.get(`${token}:${id}`);
      if (hit) out.set(id, hit);
    }
    return out;
  }),
};

jest.mock("@ai-matrx/associations/core", () => ({ createAssociationsStore: () => ({ titles: baseTitles }) }));
jest.mock("@ai-matrx/records/core", () => ({ storeDoors: () => ({ entityReferenceWords: (...a: unknown[]) => door(...a) }) }));
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "u" }));
jest.mock("@/utils/supabase/sessionBarrier", () => ({ sessionStateNow: () => "attached" }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org" }));
jest.mock("@ai-matrx/chat/host/org", () => ({ withOrganizationRefusalShown: async (_a: string, f: () => unknown) => f() }));
jest.mock("../errorSink", () => ({ associationsErrorSink: () => undefined }));
jest.mock("@/features/scopes/registry/entityRegistry", () => ({ getAssociationsEntityOverlay: () => ({}) }));
jest.mock("@/lib/organizations/activeOrg", () => ({ getActiveOrgId: () => "org-1" }));

import { getAssociationsStore } from "../associationsStore";

const PERIOD = "3698766c-0000-4000-8000-000000000001";
const NAMED = "3698766c-0000-4000-8000-000000000002";

beforeEach(() => {
  door.mockReset();
  candidateTitles.clear();
});

describe("a linked thing is named by relation_label", () => {
  it("the store: an id the candidate search cannot title is named by relation_label, never Untitled", async () => {
    door.mockResolvedValue({ data: [{ token: "hr_pay_period", id: PERIOD, label: "Pay period · 2026-08-28 · 3698766c" }], error: null });
    const got = await getAssociationsStore().titles.fetch("hr_pay_period", [PERIOD]);
    expect(got.get(PERIOD)).toBe("Pay period · 2026-08-28 · 3698766c");
    expect(getAssociationsStore().titles.get("hr_pay_period", PERIOD)).toBe("Pay period · 2026-08-28 · 3698766c");
    expect(door).toHaveBeenCalledWith("org-1", [{ token: "hr_pay_period", id: PERIOD }]);
  });

  it("unresolved: a refused or failed label door leaves the id unnamed so the caller's own fallback shows", async () => {
    door.mockResolvedValue({ data: null, error: { message: "no" } });
    const got = await getAssociationsStore().titles.fetch("hr_pay_period", [PERIOD]);
    expect(got.has(PERIOD)).toBe(false);
  });

  it("asked only for what the candidate search could not title, and never for a store record", async () => {
    candidateTitles.set(`agent:${NAMED}`, "Writer");
    door.mockResolvedValue({ data: [], error: null });
    await getAssociationsStore().titles.fetch("agent", [NAMED]);
    await getAssociationsStore().titles.fetch("record", [PERIOD]);
    expect(door).not.toHaveBeenCalled();
  });
});
