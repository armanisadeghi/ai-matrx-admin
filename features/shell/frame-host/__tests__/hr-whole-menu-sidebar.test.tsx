/**
 * HR's module list IS the product's whole menu in the frame's sidebar (owner, 2026-10-22): /hr is a
 * declared kind-B route marked `wholeMenu`, so once HR claims the sidebar the host reports
 * `productRows: false` and the frame does not repeat HR's shorter route-table rows (under More).
 * PROVEN FAILING BEFORE PASSING: before `wholeMenu`, /hr was not a kind-B route at all and the
 * frame's 15 HR rows were the only sidebar while the header switcher held the full module list.
 */
import React, { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  FRAME_PAGE_SIDEBAR_ROUTES,
  pageSidebarIsWholeMenu,
  routeSuppliesPageSidebar,
} from "../frameSidebarSlot";
import { useFrameProductSidebar } from "../frameProductSidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("/hr is a declared whole-menu page sidebar; other kind-B routes are not", () => {
  for (const p of ["/hr", "/hr/time/timesheets", "/hr/me/clock"]) {
    expect(routeSuppliesPageSidebar(p)).toBe(true);
    expect(pageSidebarIsWholeMenu(p)).toBe(true);
  }
  expect(routeSuppliesPageSidebar("/hrx")).toBe(false);
  expect(pageSidebarIsWholeMenu("/notes")).toBe(false);
  expect(FRAME_PAGE_SIDEBAR_ROUTES.find((r) => r.wholeMenu)?.owner).toBe("features/hr/shared/HrFrameMenu.tsx");
});

it.each([
  ["/hr/time/timesheets", false],
  ["/notes", true],
])("%s: once the page claims the sidebar, productRows is %s", (pathname, expected) => {
  const seen: boolean[] = [];
  function Probe() {
    const { slotHost, productRows } = useFrameProductSidebar(pathname, null);
    useEffect(() => slotHost.claim(), [slotHost]);
    seen.push(productRows);
    return null;
  }
  const host = document.createElement("div");
  const root: Root = createRoot(host);
  act(() => root.render(<Probe />));
  expect(seen.at(-1)).toBe(expected);
  act(() => root.unmount());
});
