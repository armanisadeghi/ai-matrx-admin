/**
 * WHAT'S NEW — the Sidebar slot and the launchpad band are ONE list with ONE set of actions.
 * WHAT'S NEW RENDERS when the catalog gains an entry the person's own sidebar has not reviewed.
 * The live catalog is at version 2 (three ids added 2026-10-19); this adds one more real entry "added in
 * version 2" so the slot is proven on an entry not in the default sidebar: a person layout based on
 * version 1 must render "New: <label>" with Add and Dismiss, and
 * Add must save that entry into her sidebar. A dismissed or already-placed entry must render nothing.
 */
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CATALOG_ADDED_IN, getCatalogEntry, SHELL_CATALOG_VERSION } from "@/features/shell/shell-layout/catalog";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody } from "@/features/shell/shell-layout/contract";
import { initialShellLayoutState, type ShellLayoutState } from "@/features/shell/shell-layout/shellLayoutSlice";
import { parseShellLayoutBody, serializeShellLayoutBody } from "@/features/shell/shell-layout/validate";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// One real menu entry, not in the default sidebar's top level, marked "added in" the current version; the
// body is one version behind with every other real addition dismissed, so only NEW_ID is offered whatever
// the live catalog version is.
const NEW_ID = "data.bases";
const OTHER_NEW = Object.keys(CATALOG_ADDED_IN);
(CATALOG_ADDED_IN as Record<string, number>)[NEW_ID] = SHELL_CATALOG_VERSION;

let state: { shellLayout: ShellLayoutState; userAuth: { id: string; isAdmin: boolean } };
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: (selector: (s: unknown) => unknown) => selector(state) }));
jest.mock("@/features/overlays/definitions/shellLayoutEditorWindow.overlay", () => ({ useOpenShellLayoutEditor: () => jest.fn() }));
jest.mock("@/features/shell/shell-layout/editor/ShellLayoutMount", () => ({ ShellLayoutMount: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
const save = jest.fn(async (..._args: unknown[]) => ({ ok: true as const }));
jest.mock("@/features/shell/shell-layout/useShellLayoutStore", () => ({
  useShellLayoutStore: () => ({ person: state.shellLayout.person, saving: false, save }),
}));

import { WhatsNewSlot } from "./SidebarLayoutSlots";

function personBody(extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody {
  return { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION - 1, sidebar: [{ kind: "nav", id: "n1", ref: "workspace" }], dismissedNew: OTHER_NEW, ...extra } as ShellLayoutBody;
}

function hold(body: ShellLayoutBody) {
  state = {
    userAuth: { id: "u-1", isAdmin: false },
    shellLayout: {
      ...initialShellLayoutState,
      enabled: true,
      status: "ready",
      person: { recordId: "r-1", organizationId: "o-1", version: 3, updatedAt: "2026-10-19T00:00:00Z", body: serializeShellLayoutBody(body) },
    },
  };
}

async function render(): Promise<{ host: HTMLElement; unmount: () => void }> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<WhatsNewSlot />));
  return { host, unmount: () => act(() => root.unmount()) };
}

beforeEach(() => save.mockClear());

/** What a save wrote: the save lane takes a change of the layout as it then stands. */
function savedBody(call: number, now: ShellLayoutBody = parseShellLayoutBody(state.shellLayout.person!.body).body!): ShellLayoutBody {
  const arg = save.mock.calls[call]![1] as ShellLayoutBody | ((current: ShellLayoutBody | null) => ShellLayoutBody);
  return typeof arg === "function" ? arg(now) : arg;
}

it("shows 'New: <label>' with Add and Dismiss, and Add saves it into her sidebar", async () => {
  const label = getCatalogEntry(NEW_ID)?.label;
  expect(label).toBeTruthy();
  hold(personBody());
  const { host, unmount } = await render();
  expect(host.textContent).toContain(`New: ${label}`);
  const add = [...host.querySelectorAll("button")].find((b) => b.textContent === "Add");
  expect(add).toBeTruthy();
  expect(host.querySelector(`button[aria-label="Dismiss ${label}"]`)).toBeTruthy();
  await act(async () => add!.click());
  expect(save).toHaveBeenCalledTimes(1);
  const saved = savedBody(0);
  expect(JSON.stringify(saved.sidebar)).toContain(NEW_ID);
  unmount();
});

it("renders nothing once dismissed", async () => {
  hold(personBody({ dismissedNew: Object.keys(CATALOG_ADDED_IN) }));
  const { host, unmount } = await render();
  expect(host.textContent).not.toContain("New:");
  unmount();
});

it("renders nothing for a layout already based on the new catalog version", async () => {
  hold(personBody({ basedOnCatalogVersion: SHELL_CATALOG_VERSION }));
  const { host, unmount } = await render();
  expect(host.textContent).not.toContain("New:");
  unmount();
});

// ── "Your organization updated its menu" (lane AA: the reviewed version lives in HER body, never localStorage) ──

const ORG_BODY: ShellLayoutBody = {
  schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION,
  basedOnCatalogVersion: SHELL_CATALOG_VERSION,
  sidebar: [
    { kind: "nav", id: "o1", ref: "workspace" },
    { kind: "link", id: "o2", label: "Team handbook", icon: "Link2", href: "/p/handbook" },
  ],
};

function holdWithOrg(own: ShellLayoutBody, org: { version: number; updatedAt: string }) {
  hold(own);
  state.shellLayout = {
    ...state.shellLayout,
    organizationId: "o-1",
    organizations: { "o-1": { recordId: "r-org", organizationId: "o-1", version: org.version, updatedAt: org.updatedAt, body: serializeShellLayoutBody(ORG_BODY) } },
  };
}
const OWN = () => personBody({ basedOnCatalogVersion: SHELL_CATALOG_VERSION });
const buttonNamed = (host: ParentNode, text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent === text || b.getAttribute("aria-label") === text);

it("offers it when the organization saved after her, and the server render hydrates without a mismatch", async () => {
  const { renderToString } = await import("react-dom/server");
  const { hydrateRoot } = await import("react-dom/client");
  holdWithOrg(OWN(), { version: 5, updatedAt: "2026-10-21T00:00:00Z" });
  const host = document.createElement("div");
  host.innerHTML = renderToString(<WhatsNewSlot />);
  expect(host.textContent).toContain("Your organization updated its menu"); // in the server's HTML
  document.body.appendChild(host);
  const recoverable = jest.fn();
  let root: ReturnType<typeof hydrateRoot> | null = null;
  await act(async () => {
    root = hydrateRoot(host, <WhatsNewSlot />, { onRecoverableError: recoverable });
  });
  expect(recoverable).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Your organization updated its menu");
  act(() => root!.unmount());
});

it("does not offer it when her layout is newer than the organization's, or that version is reviewed", async () => {
  holdWithOrg(OWN(), { version: 5, updatedAt: "2026-10-01T00:00:00Z" });
  let r = await render();
  expect(r.host.textContent).not.toContain("Your organization updated its menu");
  r.unmount();
  holdWithOrg(personBody({ basedOnCatalogVersion: SHELL_CATALOG_VERSION, reviewedOrgLayouts: { "o-1": 5 } }), { version: 5, updatedAt: "2026-10-21T00:00:00Z" });
  r = await render();
  expect(r.host.textContent).not.toContain("Your organization updated its menu");
  r.unmount();
  holdWithOrg(personBody({ basedOnCatalogVersion: SHELL_CATALOG_VERSION, reviewedOrgLayouts: { "o-1": 5 } }), { version: 6, updatedAt: "2026-10-21T00:00:00Z" });
  r = await render();
  expect(r.host.textContent).toContain("Your organization updated its menu");
  r.unmount();
});

it("Dismiss records the organization's version in her layout", async () => {
  holdWithOrg(OWN(), { version: 7, updatedAt: "2026-10-21T00:00:00Z" });
  const { host, unmount } = await render();
  await act(async () => buttonNamed(host, "Dismiss")!.click());
  expect(savedBody(0).reviewedOrgLayouts).toEqual({ "o-1": 7 });
  unmount();
});

it("Review lists what the organization's menu has that hers lacks: Add per row, and Use the organization's menu", async () => {
  holdWithOrg(OWN(), { version: 7, updatedAt: "2026-10-21T00:00:00Z" });
  const { host, unmount } = await render();
  await act(async () => buttonNamed(host, "Review")!.click());
  const dialog = document.querySelector("[data-shell-org-menu-review]")!;
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain("Team handbook"); // hers lacks it
  expect(dialog.textContent).not.toContain("Workspace"); // she has it already
  await act(async () => buttonNamed(dialog, "Add")!.click());
  const added = savedBody(0);
  expect(added.sidebar!.some((n) => n.kind === "link" && n.href === "/p/handbook")).toBe(true);
  await act(async () => buttonNamed(dialog, "Use the organization's menu")!.click());
  const taken = savedBody(1);
  expect(taken.sidebar).toEqual(ORG_BODY.sidebar);
  expect(taken.reviewedOrgLayouts).toEqual({ "o-1": 7 });
  unmount();
});

it("the launchpad band is the same offers; absent (no element at all) when nothing is new", async () => {
  const { WhatsNewOffers } = await import("@/features/shell/shell-layout/editor/WhatsNewOffers");
  holdWithOrg(OWN(), { version: 7, updatedAt: "2026-10-21T00:00:00Z" });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<WhatsNewOffers placement="band" />));
  expect(host.querySelector('[data-shell-whats-new="band"]')?.textContent).toContain("Your organization updated its menu");
  holdWithOrg(OWN(), { version: 7, updatedAt: "2026-10-01T00:00:00Z" });
  await act(async () => root.render(<WhatsNewOffers placement="band" key="again" />));
  expect(host.innerHTML).toBe("");
  act(() => root.unmount());
});
