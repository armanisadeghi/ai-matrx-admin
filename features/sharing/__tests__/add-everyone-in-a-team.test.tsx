/**
 * AT-SHARE-B — Airtable parity "Workspace roles and user groups": share a table with a TEAM.
 *
 * The platform's teams (`iam.team`, read through `team_list` / `team_members`) are offered beside "Everyone" in
 * "Add everyone in an organization or team". Picking a team lists ITS current members and grants each PERSON through
 * the same door the single-person share uses (SHARE-PEOPLE-ONLY: a team is never a grantee). What a team member gets
 * is exactly the level picked for the team.
 *
 * RED before AT-SHARE-B (no team is offered; every organization member is granted); GREEN after. That the grant a
 * team member receives really opens the table for them is proved against the live store
 * (`scripts/campaign-tests/atshare_b_team_share.sql`).
 */

import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ME = "87a6e699-3622-4869-8843-d0867456c0dd";
const TEST = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";
const PRIYA = "a1c3e5f7-0000-4000-8000-00000000b001";
const OWEN = "a1c3e5f7-0000-4000-8000-00000000b002";
const ORG = "4c425bfe-9a08-402f-9496-488580623f42";
const CREW = "7e1d0c3b-0000-4000-8000-00000000c001";

const rpc = jest.fn(async (name: string, args?: Record<string, unknown>) => {
  if (name === "get_organization_members_with_users") {
    return {
      data: [
        { user_id: ME, user_email: "admin@admin.com", user_display_name: "Morgan Reyes" },
        { user_id: TEST, user_email: "test@test.com", user_display_name: "Alex Hart" },
        { user_id: PRIYA, user_email: "priya.nair@oakandriver.co", user_display_name: "Priya Nair" },
        { user_id: OWEN, user_email: "owen.brandt@oakandriver.co", user_display_name: "Owen Brandt" },
      ],
      error: null,
    };
  }
  if (name === "team_list") {
    return {
      data: [
        { id: CREW, name: "Field crew", member_count: 2, archived_at: null, created_at: "2026-10-01T00:00:00Z" },
        { id: "7e1d0c3b-0000-4000-8000-00000000c002", name: "Old crew", member_count: 3, archived_at: "2026-10-02T00:00:00Z", created_at: "2026-09-01T00:00:00Z" },
      ],
      error: null,
    };
  }
  if (name === "team_members" && args?.["p_team_id"] === CREW) {
    return {
      data: [
        { user_id: TEST, role: "member", email: "test@test.com", display_name: "Alex Hart" },
        { user_id: OWEN, role: "admin", email: "owen.brandt@oakandriver.co", display_name: "Owen Brandt" },
      ],
      error: null,
    };
  }
  return { data: null, error: { message: `unanswered rpc ${name}` } };
});

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ rpc }), supabase: { rpc } }));
jest.mock("@/lib/supabase/authRetry", () => ({ runWithSessionRetry: (fn: () => unknown) => fn() }));
jest.mock("@/features/agent-context/hooks/useNavTree", () => ({
  useNavTree: () => ({ orgs: [{ id: ORG, name: "Oak & River" }], isLoading: false }),
  useOrganizationsToCreateIn: () => ({ orgs: [{ id: ORG, name: "Oak & River" }], isLoading: false }),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (sel: (s: unknown) => unknown) => sel({ appContext: {} }) }));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => ME }));
// The select is drawn as plain buttons so a test can pick an item; the component's logic is untouched.
jest.mock("@/components/ui/select", () => {
  const R = jest.requireActual("react") as typeof React;
  const Ctx = R.createContext<{ onValueChange: (v: string) => void; id?: string }>({ onValueChange: () => {} });
  return {
    Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children: React.ReactNode }) =>
      R.createElement(Ctx.Provider, { value: { onValueChange } }, children),
    SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => R.createElement("div", { "data-trigger": id }, children),
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => R.createElement("div", null, children),
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const ctx = R.useContext(Ctx);
      return R.createElement("button", { type: "button", "data-select-item": value, onClick: () => ctx.onValueChange(value) }, children);
    },
  };
});

import { AddEveryoneInOrg } from "@/features/sharing/components/AddEveryoneInOrg";
import { forgetOrganizationMemberRows } from "@/features/organizations/service/orgMemberRows";

beforeEach(() => forgetOrganizationMemberRows());

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const flush = async () => {
  for (let i = 0; i < 8; i += 1) await act(async () => { await Promise.resolve(); });
};
const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(text));

describe("Add everyone in a team names the team's people", () => {
  it("offers the organization's live teams, lists the picked team's members, and grants each at the picked level", async () => {
    const grantPerson = jest.fn(async () => ({ success: true as const }));
    act(() => root.render(<AddEveryoneInOrg grantPerson={grantPerson} level="editor" defaultOrgId={ORG} />));
    act(() => button("Add everyone in an organization")!.click());
    await flush();

    // The live team is offered; the archived one is not.
    const crew = host.querySelector(`[data-select-item="${CREW}"]`) as HTMLButtonElement | null;
    expect(crew?.textContent).toContain("Field crew");
    expect(host.textContent).not.toContain("Old crew");

    act(() => crew!.click());
    await flush();

    expect(host.textContent).toContain("Add everyone in Field crew");
    const rows = Array.from(host.querySelectorAll("[data-member]")).map((r) => r.getAttribute("data-member"));
    expect(rows).toEqual(["test@test.com", "owen.brandt@oakandriver.co"]);

    act(() => button("Share with 2 people")!.click());
    await flush();

    const calls = grantPerson.mock.calls as unknown as [{ userId: string }, string][];
    expect(calls.map((c) => c[0].userId)).toEqual([TEST, OWEN]);
    expect(calls.every((c) => c[1] === "editor")).toBe(true);
  });
});
