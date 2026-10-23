/**
 * A MODULE HEADER'S TRAIL YIELDS TO THE PAGE'S (2026-10-22). A shared module header kept in a layout
 * (Education's) draws the derived trail inline (`<DerivedBreadcrumb fallback />`). In the new frame it
 * must hand that trail over as a FALLBACK: the layout re-declares whenever the address changes, after
 * the page's own effects, so a page declaration would otherwise lose to the layout's newer one.
 *
 * RED before: `DerivedBreadcrumb` had no `fallback` and declared every trail as the page's.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/shell/breadcrumbs/useDerivedTrail", () => ({
  useDerivedTrail: () => [{ label: "Education", href: "/education" }, { label: "Kits" }],
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const { DerivedBreadcrumb } = require("../DerivedBreadcrumb") as typeof import("../DerivedBreadcrumb");
const { FramePageHeaderContext } = require("@/features/shell/frame-host/framePageHeader") as typeof import("@/features/shell/frame-host/framePageHeader");
/* eslint-enable @typescript-eslint/no-require-imports */

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function declared(props: { fallback?: boolean }) {
  const calls: Array<{ fallback?: boolean } | undefined> = [];
  const frame = {
    declareCrumbs: (_c: unknown, options?: { fallback?: boolean }) => {
      calls.push(options);
      return () => {};
    },
    declareActions: () => () => {},
  };
  act(() =>
    root.render(
      <FramePageHeaderContext.Provider value={frame}>
        <DerivedBreadcrumb {...props} />
      </FramePageHeaderContext.Provider>,
    ),
  );
  return calls;
}

it("a module header's trail is a fallback the page's own trail outranks", () => {
  expect(declared({ fallback: true })).toEqual([{ fallback: true }]);
});

it("a page's inline trail is still the page's", () => {
  expect(declared({})).toEqual([{ fallback: false }]);
});
