/**
 * AN EDITOR WHO MAY SHARE IS NEVER TOLD A RECORD IS "NOT SHARED WITH ANYONE".
 *
 * Only the owner (and Admins) can read a record's grant list. A member with Edit who may share
 * someone else's workbook opened the Share dialog and read "Not shared with anyone" — false: that
 * member holds a grant themselves (found live 2026-10-11, Workbooks and Documents). In any seat but
 * the owner's, an empty list now says who can see the list. (Publishing stays: it is an Edit-level
 * action by doctrine — SHARE_LEVELS.md.)
 *
 * Break that turns this red: the empty-list note going back to `!canShare` (the sharer's seat).
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORG = "4c425bfe-9a08-402f-9496-488580623f42";
const TABLE = "5ebcf5ec-c40e-4621-b181-d96d2a7a017b";
const HOME = "2c1d4319-bf0d-40bc-8ca1-657f4063d080";

const seat = { owner: false };
const setWhoCanSee = jest.fn(async () => ({ success: true }));
const sharing = {
  permissions: [],
  isPublic: false,
  shownTo: undefined,
  organizationDefault: { level: "viewer", organizationName: "Oak & River", organizationId: ORG },
  whoCanSee: {
    source: "store",
    choice: "organization",
    organizationId: ORG,
    organizationName: "Oak & River",
    memberDefaultLevel: "viewer",
    membersReachNow: true,
    worldOffered: false,
  },
  setWhoCanSee,
  setShownTo: jest.fn(),
  loading: false,
  error: null,
  shareWithUser: jest.fn(),
  makePublic: jest.fn(),
  revokeAccess: jest.fn(),
  revokeOrgAccess: jest.fn(),
  updateLevel: jest.fn(),
  refresh: jest.fn(),
  refreshRowState: jest.fn(),
  homeOrganizationId: HOME,
};

const useSharingCalls: unknown[][] = [];
jest.mock("@/utils/permissions/hooks", () => ({
  useSharing: (...args: unknown[]) => {
    useSharingCalls.push(args);
    return sharing;
  },
  useIsOwner: () => ({ isOwner: seat.owner, loading: false, error: null }),
}));
jest.mock("@/features/agent-context/hooks/useNavTree", () => ({
  useNavTree: () => ({ orgs: [{ id: ORG, name: "Oak & River" }], isLoading: false }),
}));
jest.mock("@/features/sharing/components/PermissionsList", () => ({ PermissionsList: () => <p>Not shared with anyone</p> }));
jest.mock("@/features/sharing/hooks/useGrantableLevels", () => ({
  useGrantableLevels: () => ({ loading: false, error: null, levels: { viewer: null, editor: null }, outside: null, maySharePeople: true }),
}));
const contactProps: Array<{ organizationId?: string }> = [];
jest.mock("@/features/sharing/components/tabs/ShareWithUserTab", () => ({
  ShareWithUserTab: (props: { organizationId?: string }) => {
    contactProps.push(props);
    return null;
  },
}));
jest.mock("@/features/sharing/components/tabs/PublicAccessTab", () => ({ PublicAccessTab: () => null }));
jest.mock("@/features/sharing/components/AccessSummaryPanel", () => ({ AccessSummaryPanel: () => null }));
jest.mock("@/features/sharing/outside/OutsideSharePanel", () => ({ OutsideSharePanel: () => null }));
jest.mock("@/components/agent-copy/page-capture/usePageCapture", () => ({ usePageCapture: () => undefined }));
jest.mock("@/components/agent-copy/page-capture/PageCaptureButton", () => ({ PageCaptureButton: () => null }));
jest.mock("@/components/official/entity-ref/EntityRef", () => ({ EntityRef: () => null }));
jest.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock("@/features/window-panels/WindowPanel", () => ({
  WindowPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext", () => ({
  SurfaceRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@ai-matrx/context-menu/react", () => ({
  NonEditableContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/features/marketing/components/site/MarketingSiteContext", () => ({
  useMarketingSite: () => ({
    site: { id: TABLE, name: "Oak & River nursery", domain: "oakandriver.co", organization_id: ORG },
  }),
}));

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

async function open() {
  const { ShareModal } = await import("@/features/sharing/components/ShareModal");
  act(() =>
    root.render(
      <ShareModal isOpen onClose={() => undefined} resourceType={"workbook" as never} resourceId={TABLE} resourceName="Service Calls" />,
    ),
  );
  return document.body.textContent ?? "";
}

it("an editor who may share sees who can read the list, not 'Not shared with anyone'", async () => {
  seat.owner = false;
  const text = await open();
  expect(text).toContain("The list of people with access is visible to the owner and Admins.");
  expect(text).not.toContain("Not shared with anyone");
});

it("the owner still sees the real list", async () => {
  seat.owner = true;
  const text = await open();
  expect(text).toContain("Not shared with anyone");
  expect(text).not.toContain("visible to the owner and Admins");
});
