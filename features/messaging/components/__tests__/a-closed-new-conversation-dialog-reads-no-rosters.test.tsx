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
 *
 * THE CLASS, NOT THE INSTANCE (2026-10-16). The same shape lived in the task assignee picker
 * (a closed popover in every task editor and directive form) and the meeting guest picker (a
 * field whose suggestions appear only after typing). Every people picker that can sit on a page
 * unused is rendered here unused and must read ZERO rosters; and every `useUserConnections`
 * caller in the app must either pass `enabled` or be named below with why its list is on screen
 * the moment it mounts — so the next closed picker fails here before it ships.
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

// An organization she is in that is NOT on the first page of 50 the store holds.
const OFF_PAGE_ORG = { id: "00000000-0000-4000-8000-0000000000ff", name: "Titanium", role: "member", archivedAt: null };
// An organization she is NOT in, and one whose membership read failed.
const NOT_MINE_ORG_ID = "00000000-0000-4000-8000-0000000000fe";
const UNREADABLE_ORG_ID = "00000000-0000-4000-8000-0000000000fd";
jest.mock("@/features/organizations/service/organizationLookup", () => ({
  lookupOrganizations: async (ids: string[]) =>
    new Map(ids.filter((id) => id === OFF_PAGE_ORG.id).map((id) => [id, OFF_PAGE_ORG])),
  lookupFailed: (id: string) => id === UNREADABLE_ORG_ID,
}));

jest.mock("@/features/organizations/service/invitationsService", () => ({
  invitationsService: { listForTarget: async () => ({ ok: true, data: { invitations: [] } }) },
}));

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { NewConversationDialog } from "@/features/messaging/components/NewConversationDialog";
import TaskAssigneePicker from "@/features/tasks/components/TaskAssigneePicker";
import { GuestPicker } from "@/features/meet/components/manage/GuestPicker";
import { useUserConnections } from "@/features/messaging/hooks/useUserConnections";
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
      <NewConversationDialog open={firstOpen} onOpenChange={() => undefined} onCreated={() => undefined} />
      <NewConversationDialog open={false} onOpenChange={() => undefined} onCreated={() => undefined} />
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

describe("every people picker that sits on a page unused reads no roster", () => {
  it("an unassigned task assignee picker reads nothing until it opens", async () => {
    // The directive form mounts it with no organization: unguarded, that is every roster.
    await act(async () =>
      root.render(
        <>
          <TaskAssigneePicker assigneeId={null} onChange={() => undefined} />
          <TaskAssigneePicker assigneeId={null} onChange={() => undefined} organizationId={ORGS[1].id} />
        </>,
      ),
    );
    await drain();
    expect(rosterRequests()).toBe(0);

    const trigger = container.querySelector("button")!;
    await act(async () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await drain();
    expect(rosterRequests()).toBeGreaterThan(0);
    expect(rosterRequests()).toBeLessThanOrEqual(ORGANIZATION_COUNT);
  });

  it("an ASSIGNED task picker reads its organization's roster to name the assignee", async () => {
    await act(async () =>
      root.render(<TaskAssigneePicker assigneeId={`u-${ORGS[3].id}`} onChange={() => undefined} organizationId={ORGS[3].id} />),
    );
    await drain();
    expect(rosterRequests()).toBe(1);
    expect(container.textContent).toContain(`Person ${ORGS[3].id.slice(-2)}`);
  });

  it("an untouched meeting guest field reads nothing until it is focused", async () => {
    await act(async () =>
      root.render(
        <GuestPicker guests={[]} onChange={() => undefined} organizationId={ORGS[2].id} hostUserId="u-me" />,
      ),
    );
    await drain();
    expect(rosterRequests()).toBe(0);

    const input = container.querySelector("input")!;
    await act(async () => input.focus());
    await drain();
    expect(rosterRequests()).toBe(1);
  });
});

describe("a named organization past the first page of organizations", () => {
  it("is looked up by id and its roster read — never a silently empty picker", async () => {
    // admin@admin.com's meeting in "Titanium": not in the first 50 organizations the store holds.
    await act(async () =>
      root.render(
        <GuestPicker guests={[]} onChange={() => undefined} organizationId={OFF_PAGE_ORG.id} hostUserId="u-me" />,
      ),
    );
    await drain();
    expect(rosterRequests()).toBe(0);

    const input = container.querySelector("input")!;
    await act(async () => input.focus());
    await drain();
    expect(rpc.mock.calls.filter(([name]) => name === "get_organization_members_with_users").map(([, a]) => a.p_org_id)).toEqual([
      OFF_PAGE_ORG.id,
    ]);
  });
});

function Probe({ organizationId }: { organizationId: string }) {
  const { isLoading, partialFailures, connections } = useUserConnections({ organizationId });
  return (
    <output data-loading={String(isLoading)} data-people={connections.length}>
      {partialFailures.map((f) => f.source).join("|")}
    </output>
  );
}

describe("an off-page organization that is not hers, or could not be checked", () => {
  it("asks no roster for an organization she is not in", async () => {
    await act(async () => root.render(<Probe organizationId={NOT_MINE_ORG_ID} />));
    await drain();
    expect(rosterRequests()).toBe(0);
    expect(container.querySelector("output")!.dataset.loading).toBe("false");
  });

  it("says so when her membership could not be read — never a silently empty list", async () => {
    await act(async () => root.render(<Probe organizationId={UNREADABLE_ORG_ID} />));
    await drain();
    expect(rosterRequests()).toBe(0);
    expect(container.querySelector("output")!.textContent).toBe("this organization");
  });
});

/**
 * Callers whose people list IS the visible content the moment they mount — never a closed
 * picker. Anything not named here must pass `enabled` (its open / engaged state).
 */
const SHOWN_ON_MOUNT: Record<string, string> = {
  // Rendered only inside an OPEN share dialog / share panel (Radix unmounts closed content).
  // The web's share-sheet host: the People tab inside an OPEN share dialog asks through it.
  "providers/SharingHost.tsx": "inside an open share surface",
  // The organization's invitations page: the list is the page.
  "features/organizations/components/InvitationManager.tsx": "the invitations page itself",
  // Inside an OPEN permissions dialog, or the file's Share tab mounted on first visit.
  "features/files/components/core/PermissionsDialog/PermissionsDialog.tsx": "inside an open dialog or visited tab",
};

describe("every useUserConnections caller is gated or named as on-screen", () => {
  const files = execFileSync(
    "git",
    ["grep", "-l", "useUserConnections(", "--", "*.ts", "*.tsx", ":!**/__tests__/**", ":!**/*.test.*"],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) => f !== "features/messaging/hooks/useUserConnections.ts");

  it("finds the callers (the census is not empty)", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files)("%s passes `enabled` or is a surface shown on mount", (file) => {
    if (SHOWN_ON_MOUNT[file]) return;
    const source = readFileSync(file, "utf8");
    const calls = source.split("useUserConnections(").slice(1);
    for (const call of calls) {
      // The argument list of this call, up to its closing paren at depth zero.
      let depth = 1;
      let end = 0;
      while (end < call.length && depth > 0) {
        if (call[end] === "(") depth += 1;
        if (call[end] === ")") depth -= 1;
        end += 1;
      }
      expect({ file, args: call.slice(0, end) }).toEqual({
        file,
        args: expect.stringMatching(/\benabled\s*:/),
      });
    }
  });
});
