/**
 * THE PHONE NEVER GETS A "FLASH MODE" POP-UP (review 2, N9, 2026-10-19).
 *
 * A flashcards block on a phone used to slide a fixed, dark-blue "Flash Mode" card over the
 * content and the editing dock a second after the cards arrived. Its buttons were dark on dark,
 * and "Not now" only closed it for the moment (it came back with the next block). The deck now
 * opens only when the person asks — the block's own deck button — so nothing fixed is ever drawn.
 *
 * Renders the real block on a phone with real cards and lets the old 1 s timer run.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@ai-matrx/kit/media-query", () => ({ useIsMobile: () => true }));
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => false }));
jest.mock("@/lib/redux/slices/userSlice", () => ({ selectIsAdmin: () => false }));
jest.mock("@/features/overlays/definitions/flashcardsBlockWindow.overlay", () => ({ useOpenFlashcardsBlockWindow: () => () => {} }));
jest.mock("@/features/canvas/components/CanvasArtifactDebugPanel", () => ({ InlineArtifactDebugStrip: () => null }));
jest.mock("@ai-matrx/print/flashcards-lazy", () => ({ flashcardsPrinterLazy: {} }));
jest.mock("@ai-matrx/print/react", () => ({ PrintOptionsDialog: () => null }));
jest.mock("@ai-matrx/rich-content/display/blocks/ChatCollapsibleWrapper", () => ({
  __esModule: true,
  default: ({ children, controls }: { children: React.ReactNode; controls: React.ReactNode }) => <div>{controls}{children}</div>,
}));
jest.mock("@ai-matrx/rich-content/display/block-controls/BlockControls", () => ({ BlockControlsButton: () => null }));
jest.mock("../FlashcardMobileView", () => ({ __esModule: true, default: () => null }));
jest.mock("../FullScreenPortal", () => ({ FullScreenPortal: ({ children }: { children: React.ReactNode }) => <>{children}</> }), { virtual: true });
jest.mock("../flashcards-set-parts", () => ({
  useFlashcardsSet: () => ({
    flashcards: [{ front: "a", back: "b" }, { front: "c", back: "d" }],
    completeCount: 2,
    isComplete: true,
    hasStreamingCard: false,
    layoutMode: "grid",
    setLayoutMode: () => {},
    printData: null,
    printOpen: false,
    setPrintOpen: () => {},
    triggerPrint: () => {},
    deckHref: null,
    handleSaveDeck: () => {},
    savingDeck: false,
    handleOpenInCanvas: () => {},
    openingCanvas: false,
    lastResult: null,
    rawPayload: null,
  }),
  FlashcardsSetBody: () => <div data-testid="body" />,
  FlashcardsSetControls: () => <button aria-label="Study as a deck">deck</button>,
}));

import FlashcardsBlock from "../FlashcardsBlock";

it("a phone block draws no fixed Flash Mode card, however long it sits", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<FlashcardsBlock content="x" />));
  // The old prompt showed at 1 s and hid itself at 9 s: look at 2 s (while it would be up).
  await act(async () => {
    jest.advanceTimersByTime(2_000);
  });
  expect(document.body.textContent).not.toContain("Not now");
  expect(document.body.textContent).not.toContain("Enter Flash Mode");
  expect(document.body.querySelector(".fixed")).toBeNull();
  expect(host.querySelector('[aria-label="Study as a deck"]')).not.toBeNull();
  await act(async () => root.unmount());
  jest.useRealTimers();
});
