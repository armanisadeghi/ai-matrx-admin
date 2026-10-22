/**
 * HrShell IN THE NEW APP FRAME hands HR's real trail to the frame and draws no breadcrumb strip
 * (no second title); classic draws the strip exactly as before.
 * PROVEN FAILING BEFORE PASSING: before the change nothing was declared and the body strip
 * (with its own h1) rendered in the frame too.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FramePageHeaderContext, type FramePageCrumb } from "@/features/shell/frame-host/framePageHeader";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({ usePathname: () => "/hr/time/timesheets" }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
jest.mock("@/features/shell/components/header/RouteHeader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/features/shell/components/header/RouteModeNav", () => ({ RouteModeNav: () => null }));
jest.mock("@/lib/layout/useClippedContentGuard", () => ({ useClippedContentGuard: () => {} }));
jest.mock("@ai-matrx/design-system/controls", () => ({
  ...jest.requireActual("@ai-matrx/design-system/controls"), InfoHint: () => null }));
jest.mock("../HrStates", () => ({
  HrDisclosureClaimed: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HrEmployerChoices: () => null,
  HrEmployerSubstitutionNotice: () => null,
}));
jest.mock("../useHrContext", () => ({
  useHrContext: () => ({ active: null, employers: [], orgRef: null, isLoading: false, scope: { mode: "all", employers: [], actives: [] } }),
}));
jest.mock("../useHrPersona", () => ({
  isOrgSteward: () => false,
  useHrPersona: () => ({ persona: "hr_admin", employmentId: null, all: [] }),
}));
jest.mock("../hr-nav", () => ({
  resolveHrNav: () => ({ flat: false, items: [{ label: "Time", href: "/hr/time", exact: false }] }),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { HrShell } = require("../HrShell") as typeof import("../HrShell");
/* eslint-enable @typescript-eslint/no-require-imports */

let host: HTMLElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function mount(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(node));
}

it("in the frame: declares HR's trail and draws no body breadcrumb", () => {
  const declared: (readonly FramePageCrumb[])[] = [];
  mount(
    <FramePageHeaderContext.Provider value={{ declareCrumbs: (c) => (declared.push(c), () => {}), declareActions: () => () => {} }}>
      <HrShell title="Timesheets">x</HrShell>
    </FramePageHeaderContext.Provider>,
  );
  expect(declared.at(-1)?.map((c) => c.label)).toEqual(["HR", "Time", "Timesheets"]);
  expect(host.querySelector("nav[aria-label=Breadcrumb]")).toBeNull();
  expect(host.querySelector("h1")).toBeNull();
});

it("classic: the body breadcrumb strip draws as before", () => {
  mount(<HrShell title="Timesheets">x</HrShell>);
  expect(host.querySelector("nav[aria-label=Breadcrumb] h1")?.textContent).toBe("Timesheets");
});
