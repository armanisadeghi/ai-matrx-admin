/**
 * CD-PERF-02 (CLOSE-PERF r4): a sub-page's breadcrumb painted "/ Dashboard" first and then, when the tree's
 * reveal brought its ancestors in, "Home / Dashboard" — the trail slid sideways (layout shift 0.0004-0.0006 at
 * 375, 768 and 1600, admin and member). The breadcrumb now keeps its slot invisible until the page's path is
 * settled, and asks for the reveal itself.
 */
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

import type { SpaceSummary } from "../../contract";

const reveal = jest.fn();
let settled = false;

jest.mock("../../state/SpacesProvider", () => ({
  useSpaces: () => ({
    store: { get: async () => null },
    childrenOf: () => [],
    byId: new Map(),
    reveal,
    ready: true,
    pathSettled: () => settled,
  }),
}));

// eslint-disable-next-line import/first -- the mock above must be registered before the module loads
import { SpacesTieredBreadcrumb } from "../tiered-crumbs";
// eslint-disable-next-line import/first
import { crumbPathPending } from "../crumb-path";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: React.ReactElement): { container: HTMLElement } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    createRoot(container).render(node);
  });
  return { container };
}

const page = (id: string, parentId: string | null): SpaceSummary => ({
  id,
  parentId,
  position: "a",
  title: id,
  icon: null,
  isArchived: false,
  updatedAt: "2026-10-22T00:00:00Z",
});

describe("a Spaces breadcrumb never grows after paint", () => {
  beforeEach(() => {
    reveal.mockClear();
    settled = false;
  });

  it("holds a sub-page's trail invisible until its ancestors are read, and asks for them", () => {
    const { container } = render(<SpacesTieredBreadcrumb className="spaces-breadcrumb" path={[page("dashboard", "home")]} />);
    const nav = container.querySelector("[data-tiered-breadcrumb]");
    expect(nav?.className).toContain("spaces-crumbs-pending");
    expect(reveal).toHaveBeenCalledWith("dashboard");
  });

  it("draws at once when the path is settled", () => {
    settled = true;
    const { container } = render(<SpacesTieredBreadcrumb className="spaces-breadcrumb" path={[page("home", null), page("dashboard", "home")]} />);
    expect(container.querySelector("[data-tiered-breadcrumb]")?.className).not.toContain("spaces-crumbs-pending");
  });

  it("a top-level page, or a screen with no tree, never waits", () => {
    expect(crumbPathPending([page("home", null)], () => false)).toBe(false);
    expect(crumbPathPending([page("dashboard", "home")], undefined)).toBe(false);
    expect(crumbPathPending([], () => false)).toBe(false);
  });
});
