/**
 * ONE HR MENU IN THE NEW APP FRAME (owner, 2026-10-22). In the frame, every HR module the person
 * has (`resolveHrNav`, the same list the classic header switcher shows) renders in the frame's
 * sidebar — Schedule, Onboarding, Training, Assets, Engagement, Tasks, Reports included — the
 * current one selected with its section's pages under it, and HrShell draws NO header switcher.
 * Classic: the header switcher, and no sidebar menu.
 *
 * PROVEN FAILING BEFORE PASSING: before the change the frame sidebar showed only the route table's
 * HR rows while HrShell's header carried a "Time" switcher holding the whole module list — seven
 * modules lived only in that dropdown.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FrameSidebarSlotContext, type FrameSidebarSlotHost } from "@/features/shell/frame-host/frameSidebarSlot";
import type { HrCapability } from "../../constants";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

jest.mock("next/navigation", () => ({
  usePathname: () => "/hr/time/timesheets",
  useRouter: () => ({ push: () => {} }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// The header renders its center in place, so the test can see whether the switcher is drawn.
jest.mock("@/features/shell/components/header/RouteHeader", () => ({
  __esModule: true,
  default: ({ center }: { center?: React.ReactNode }) => <header data-testid="route-header">{center}</header>,
}));
jest.mock("@/features/shell/components/header/RouteModeNav", () => ({
  RouteModeNav: ({ items }: { items: { name: string }[] }) => (
    <div data-testid="header-switcher">{items.map((i) => i.name).join("|")}</div>
  ),
}));
jest.mock("@/lib/layout/useClippedContentGuard", () => ({ useClippedContentGuard: () => {} }));
jest.mock("../HrStates", () => ({
  HrDisclosureClaimed: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HrEmployerChoices: () => null,
  HrEmployerSubstitutionNotice: () => null,
}));
const ACTIVE = { organization_id: "org-1", worker_class: "employee", has_active_leave_enrolment: true };
jest.mock("../useHrContext", () => ({
  useHrContext: () => ({
    active: ACTIVE,
    employers: [],
    orgRef: null,
    isLoading: false,
    scope: { mode: "one", employers: [], actives: [ACTIVE] },
  }),
}));
const ALL_CAPS: HrCapability[] = [
  "time.read",
  "working_record.read",
  "requisition.manage",
  "candidate.read",
  "records.govern",
  "audit.read",
  "identity.write",
] as HrCapability[];
jest.mock("../useHrPersona", () => ({
  isOrgSteward: () => false,
  useHrPersona: () => ({ persona: "hr_admin", employmentId: "emp-1", all: ALL_CAPS }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { HrFrameSidebar } = require("../HrFrameMenu") as typeof import("../HrFrameMenu");
const { HrSubShell } = require("../HrSubShell") as typeof import("../HrSubShell");
const { resolveHrNav } = require("../hr-nav") as typeof import("../hr-nav");
/* eslint-enable @typescript-eslint/no-require-imports */

const TIME_TABS = [
  { key: "timesheets", label: "Timesheets", href: "/hr/time/timesheets" },
  { key: "punches", label: "Punches", href: "/hr/time/punches" },
  { key: "hidden", label: "Hidden", href: "/hr/time/hidden", visible: false },
];

let host: HTMLElement;
let target: HTMLElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

function Page() {
  return (
    <HrFrameSidebar>
      <HrSubShell tabs={TIME_TABS} title="Timesheets">
        <p>body</p>
      </HrSubShell>
    </HrFrameSidebar>
  );
}

function mount(inFrame: boolean) {
  host = document.createElement("div");
  target = document.createElement("div");
  target.setAttribute("data-testid", "frame-sidebar");
  document.body.append(host, target);
  root = createRoot(host);
  const slot: FrameSidebarSlotHost = { target, claim: () => () => {} };
  act(() =>
    root.render(
      inFrame ? (
        <FrameSidebarSlotContext value={slot}>
          <Page />
        </FrameSidebarSlotContext>
      ) : (
        <Page />
      ),
    ),
  );
}

const rowTitles = (node: Element) =>
  Array.from(node.querySelectorAll(".matrx-tile-title")).map((n) => n.textContent);

const expectedModules = () =>
  resolveHrNav({
    persona: "hr_admin",
    capabilities: ALL_CAPS,
    employmentId: "emp-1",
    org: null,
    active: ACTIVE as never,
  }).items.map((i) => i.label);

it("in the frame: the whole module list is the frame sidebar, with no header switcher", () => {
  mount(true);
  const menu = target.querySelector("[data-hr-frame-menu]");
  expect(menu).not.toBeNull();
  const top = Array.from(menu!.children).map((li) => li.querySelector(".matrx-tile-title")?.textContent);
  expect(top).toEqual(expectedModules());
  for (const module of ["Schedule", "Onboarding", "Training", "Assets", "Engagement", "Tasks", "Reports"]) {
    expect(top).toContain(module);
  }
  // The current module carries its section's pages under it (the hidden tab stays absent).
  const sub = menu!.querySelector("[data-hr-frame-subpages]");
  expect(sub?.closest("li")?.querySelector(".matrx-tile-title")?.textContent).toBe("Time");
  expect(rowTitles(sub!)).toEqual(["Timesheets", "Punches"]);
  expect(sub!.querySelector('[aria-current="page"]')?.textContent).toBe("Timesheets");
  // One menu: no header switcher, no body tab strip, nothing drawn in the page body.
  expect(host.querySelector('[data-testid="header-switcher"]')).toBeNull();
  expect(host.querySelector('nav[aria-label="Section"]')).toBeNull();
  expect(host.querySelector("[data-hr-frame-menu]")).toBeNull();
});

it("classic: the header switcher and the body tab strip, and no sidebar menu", () => {
  mount(false);
  expect(host.querySelector('[data-testid="header-switcher"]')?.textContent?.split("|")).toEqual(expectedModules());
  expect(host.querySelector('nav[aria-label="Section"]')).not.toBeNull();
  expect(document.querySelector("[data-hr-frame-menu]")).toBeNull();
});
