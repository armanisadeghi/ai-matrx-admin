/**
 * THE MATH BLOCK IS ONE FRAME (review 3, R6, 2026-10-20). It drew a card inside a card: the block
 * header said "Solve for x", a bordered hero card repeated "Solve for x", and a second card held an
 * "All Lessons" link to /education that left the note or chat. Break it names: the old body (embedded
 * unset, Card + ControlPanel link) → every case below red.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/dynamic", () => () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/features/math/components/MathProblemImpl").default;
});
jest.mock("@ai-matrx/print/react", () => ({
  PrintOptionsDialog: () => null,
  usePrintOptions: () => ({ open: false, setOpen: jest.fn(), triggerPrint: jest.fn() }),
}));
jest.mock("../math-printer", () => ({ mathPrinter: {} }));
jest.mock("@/features/math/utils/math-problem-persistence", () => ({ downloadMathProblem: jest.fn(), uploadMathProblem: jest.fn() }));

import MathProblemBlock from "../MathProblemBlock";
import { TooltipProvider } from "@ai-matrx/design-system";

const problem = {
  math_problem: {
    title: "Solve for x",
    description: "A linear equation.",
    intro_text: "Let us begin.",
    final_statement: "Done.",
    problem_statement: { text: "Solve 2x+3=7", equation: "2x+3=7", instructions: "" },
    solutions: [],
  },
};

(Element.prototype as unknown as { scrollTo: () => void }).scrollTo = () => {};
let host: HTMLDivElement;
beforeEach(async () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(
      <TooltipProvider>
        <MathProblemBlock problemData={problem as never} />
      </TooltipProvider>,
    );
  });
});
afterEach(() => host.remove());

const countText = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll("*")).filter((el) => el.children.length === 0 && el.textContent?.trim() === text).length;

describe("the math block is one plain card with one header", () => {
  it("draws exactly one frame and no card inside it", () => {
    expect(host.querySelectorAll("[data-block-frame]").length).toBe(1);
    expect(host.querySelectorAll('[data-slot="card"], [data-matrx-card]').length).toBe(0);
  });

  it("says the title once, in the header", () => {
    const header = host.querySelector("[data-block-header]")!;
    expect(header.textContent).toContain("Solve for x");
    expect(countText(host, "Solve for x")).toBe(1);
  });

  it("has no link that leaves the note or chat", () => {
    expect(host.querySelector('a[href^="/education"]')).toBeNull();
    expect(host.textContent).not.toContain("All Lessons");
  });

  it("keeps the header's glyph and the interactive buttons", () => {
    expect(host.querySelector("[data-block-header] svg")).not.toBeNull();
    expect(host.textContent).toContain("Start Interactive");
    expect(host.textContent).toContain("Reset");
  });
});
