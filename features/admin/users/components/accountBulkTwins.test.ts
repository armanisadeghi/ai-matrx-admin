import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import { USER_ACTIONS, userActionBlocked } from "../record/userSurfaces";
import { accountBulkTwins, type AccountRow } from "./accountBulkTwins";

jest.mock("../record/useUserActions", () => ({
  runReasonDoor: jest.fn(async () => ({})),
  personChanged: jest.fn(),
}));
jest.mock("../adminRoster", () => ({ invalidateAdminRoster: jest.fn() }));

const person = (over: Partial<AccountRow>): AccountRow => ({
  id: "u1",
  email: "a@example.com",
  display_name: "A",
  is_anonymous: false,
  banned: false,
  erased: false,
  admin_level: null,
  mcp_full_access: false,
  top_tier_models: false,
  onboarding_completed: false,
  email_confirmed: false,
  ...over,
});

describe("Accounts bulk bar is generated from the people registry", () => {
  const live = USER_ACTIONS.filter((a) => a.live);
  const bar = bulkActionsFromRowVerbs(live, accountBulkTwins({ giveFreeMonths: jest.fn() }), {
    noun: "account",
    getRowId: (r: AccountRow) => r.id,
    getRowName: (r: AccountRow) => r.email ?? r.id,
    blocked: (verb, row: AccountRow) => userActionBlocked(verb.id, row, { myId: "me" }),
  });

  it("offers a twin for every outreach, access and danger verb and none for single ones", () => {
    const ids = bar.map((a) => a.id);
    for (const id of ["magic_link", "password_reset", "change_plan", "free_months", "mcp_access", "top_tier", "verify_email", "onboarded", "sign_out_everywhere", "close", "reopen"]) {
      expect(ids).toContain(id);
    }
    for (const id of ["support_session", "message", "email", "tutorial"]) expect(ids).not.toContain(id);
  });

  it("outreach confirm names how many people get an email", () => {
    const magic = bar.find((a) => a.id === "magic_link")!;
    const rows = [person({ id: "u1" }), person({ id: "u2" })];
    const selection = { ids: ["u1", "u2"], rows, count: 2 } as never;
    const confirm = magic.confirm?.(selection);
    expect(confirm?.title).toContain("2 people");
    expect(confirm?.description).toContain("2 people will get an email");
    expect(confirm?.reason).toBeDefined();
  });

  it("grays Close when every selected person is already closed", () => {
    const close = bar.find((a) => a.id === "close")!;
    const rows = [person({ banned: true })];
    expect(close.disabledReason?.(1, { ids: ["u1"], rows, count: 1 } as never)).toBe("Already closed");
  });

  it("Change plan asks only people on a granted plan", () => {
    const plan = bar.find((a) => a.id === "change_plan")!;
    const rows = [person({ plan: { key: "pro", source: "default" } })];
    expect(plan.disabledReason?.(1, { ids: ["u1"], rows, count: 1 } as never)).toBe("Already on the default plan");
  });
});
