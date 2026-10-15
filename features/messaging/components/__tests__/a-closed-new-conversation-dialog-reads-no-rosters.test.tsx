/**
 * /messages LOADS WITHOUT READING A SINGLE ORGANIZATION ROSTER (2026-10-15 walk).
 *
 * Loading /messages as admin@admin.com issued 64 `get_organization_members_with_users`
 * requests before anybody asked for a person. The New-conversation dialog is mounted CLOSED
 * beside every conversation list (the layout's sidebar list, the page's phone list, the thread
 * header), it names no organization, and its people hook read the roster of EVERY organization
 * the viewer belongs to the moment it mounted.
 *
 * The real dialog renders here, mounted the way /messages mounts it — twice, closed — against
 * an account in many organizations. Budget: ZERO roster requests while closed, and when one
 * opens, at most ONE request per organization (the shared roster read joins the second mount).
 *
 * RED without the fix: the closed mounts sweep every organization (count = organizations).
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORGANIZATION_COUNT = 12;
const ORGS = Array.from({ length: ORGANIZATION_COUNT }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  name: `Org ${i}`,
  role: "member",
}));

const rpc = jest.fn(async (name: string, args: Record<string, string>) => {
  if (name === "get_organization_members_with_users") {
    return {
      data: [
        {
          id: `m-${args.p_org_id}`,
          organization_id: args.p_org_id,
          user_id: `u-${args.p_org_id}`,
          role: "member",
          joined_at: "2026-01-01T00:00:00Z",
          invited_by: "u-me",
          user_email: `${args.p_org_id}@example.test`,
          user_display_name: `Person ${args.p_org_id.slice(-2)}`,
          user_avatar_url: "",
        },
      ],
      error: null,
    };
  }
  return { data: [], error: null };
});

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    rpc: (...a: unknown[]) => rpc(...(a as [string, Record<string, string>])),
  }),
}));

jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => ({ id: "u-me" }),
}));

jest.mock("@ai-matrx/messaging/react", () => ({
  useConversations: () => ({
    conversations: [],
    isInitialLoading: false,
    select: () => undefined,
  }),
}));

jest.mock("@/features/organizations/hooks", () => ({
  useUserOrganizations: () => ({ organizations: ORGS, loading: false, error: null, refresh: () => undefined }),
}));

jest.mock("@/features/organizations/useOrganizationRequired", () => ({
  useOrganizationRequired: () => ({ organizationState: { status: "ready", organizationId: ORGS[0].id } }),
}));

jest.mock("@/features/organizations/components/OrganizationRequiredNotice", () => ({
  OrganizationContextNotice: () => null,
}));

jest.mock("@/features/user-search/UserSearchField", () => ({
  UserSearchField: () => null,
}));

jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({
  ErrorAlchemyMenu: () => null,
}));

jest.mock("@/features/organizations/service/invitationsService", () => ({
  invitationsService: { listForTarget: async () => ({ ok: true, data: { invitations: [] } }) },
}));

import { NewConversationDialog } from "@/features/messaging/components/NewConversationDialog";
import { forgetOrganizationMemberRows } from "@/features/organizations/service/orgMemberRows";

const rosterRequests = () =>
  rpc.mock.calls.filter(([name]) => name === "get_organization_members_with_users").length;

async function drain() {
  for (let i = 0; i < 20; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  forgetOrganizationMemberRows();
  rpc.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function Page({ firstOpen }: { firstOpen: boolean }) {
  // /messages mounts the dialog beside BOTH conversation lists (sidebar + phone list).
  return (
    <>
      <NewConversationDialog open={firstOpen} onOpenChange={() => undefined} />
      <NewConversationDialog open={false} onOpenChange={() => undefined} />
    </>
  );
}

describe("/messages roster request budget", () => {
  it("issues ZERO roster requests while every New-conversation dialog is closed", async () => {
    await act(async () => root.render(<Page firstOpen={false} />));
    await drain();
    expect(rosterRequests()).toBe(0);
  });

  it("reads each organization's roster at most once when the dialog opens", async () => {
    await act(async () => root.render(<Page firstOpen={false} />));
    await drain();
    await act(async () => root.render(<Page firstOpen />));
    await drain();
    expect(rosterRequests()).toBeGreaterThan(0);
    expect(rosterRequests()).toBeLessThanOrEqual(ORGANIZATION_COUNT);
  });
});
