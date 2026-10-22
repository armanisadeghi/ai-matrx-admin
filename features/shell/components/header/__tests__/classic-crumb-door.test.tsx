/**
 * EVERY CRUMB IS A DOOR (Arman, 2026-10-22): the classic trail's sibling dropdown is the SAME
 * searchable door the new frame draws (frame/CrumbDoor) — one component, never two pickers.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/marketing/brands/vasaro",
  useSearchParams: () => new URLSearchParams(),
}));

import { CrumbNode } from "../templates/CrumbTrailHeader";

describe("classic CrumbNode", () => {
  it("a level with siblings opens the searchable CrumbDoor (siblings kind)", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() =>
      root.render(
        <CrumbNode
          isLast
          crumb={{
            label: "Vasaro",
            href: "/marketing/brands/vasaro",
            optionsLabel: "Brands",
            options: [
              { label: "Vasaro", href: "/marketing/brands/vasaro", active: true },
              { label: "Acme", href: "/marketing/brands/acme" },
            ],
          }}
        />,
      ),
    );
    expect(el.querySelector('[data-crumb-door="siblings"]')).not.toBeNull();
    act(() => root.unmount());
  });
});
