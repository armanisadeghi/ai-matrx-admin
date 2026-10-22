/**
 * The dialog close button's 44px touch floor used to be asserted by grepping
 * `components/ui/dialog.tsx`. That file is now a pure re-export of
 * `@ai-matrx/design-system` (39ca19cdb0, "adopt shared design system
 * primitives"), so the grep was measuring nothing. This renders the REAL
 * shared DialogContent and reads the close button out of the DOM instead —
 * which is what the app ships, wherever the implementation lives.
 *
 * The dialog itself (GovernedActionDialog) now lives in @ai-matrx/sharing/access/react, whose own
 * suite pins its DialogContent class; what stays here is the app-only half: the globals.css floor
 * probe and the app's shared DialogContent.
 *
 * jsdom has no layout engine, so the responsive geometry is pinned as the
 * class seam; live Browser evidence supplies the viewport proof.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { touchFloorRing } from "@/tests/helpers/touchFloorCss";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("GovernedActionDialog responsive contract", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("enforces the shared 44px touch floor for every dialog action", () => {
    expect(touchFloorRing()).toEqual({ found: true, belowLgOnly: true });

    act(() => {
      root.render(
        createElement(
          Dialog,
          { open: true },
          createElement(
            DialogContent,
            { className: "matrx-touch-targets sm:max-w-xl" },
            createElement(DialogTitle, null, "Governed action"),
          ),
        ),
      );
    });

    const closeButton = document.querySelector<HTMLElement>(
      "[role='dialog'] [aria-label='Close']",
    );
    expect(closeButton).not.toBeNull();
    expect(closeButton?.className).toContain("h-11");
    expect(closeButton?.className).toContain("w-11");
    expect(closeButton?.className).toContain("items-center");
    expect(closeButton?.className).toContain("justify-center");
    expect(closeButton?.className).toContain("rounded-sm");
    // Below the 44px floor only on pointer-fine desktop widths.
    expect(closeButton?.className).toContain("lg:h-10");
    expect(closeButton?.className).toContain("lg:w-10");
  });
});
