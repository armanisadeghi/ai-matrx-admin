/**
 * "Completed" counts only actions a person MARKED complete (review 4 follow-up, 2026-10-21).
 *
 * THE DEFECT: reaching an action by answering Yes/No added it to the completed set, so the tree
 * read "Completed 1" (and drew the action's completed check) before "Mark as Completed" was
 * pressed. The real block is rendered; only the app-wiring hooks are doubles.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => undefined,
  useAppStore: () => ({ getState: () => ({}), dispatch: jest.fn(), subscribe: () => () => {} }),
}));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/features/canvas/hooks/useCanvas", () => ({
  useCanvas: () => ({ open: jest.fn(), close: jest.fn(), isOpen: false }),
}));
jest.mock("@/features/canvas/hooks/useOpenArtifactInCanvas", () => ({
  useOpenArtifactInCanvas: () => ({ openArtifact: jest.fn() }),
}));
jest.mock("@ai-matrx/context-menu/react", () => ({
  NonEditableContextMenu: ({ children }: { children: React.ReactNode }) => children,
}));
(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

import { TooltipProvider } from "@/components/ui/tooltip";
import DecisionTreeBlock, { type DecisionTreeData } from "../DecisionTreeBlock";

const tree = {
  title: "Kiln firing",
  root: {
    id: "root",
    question: "Is the clay bone dry?",
    yes: { id: "fire", action: "Start the bisque firing" },
    no: { id: "wait", action: "Wait another day" },
  },
} as unknown as DecisionTreeData;

let host: HTMLDivElement;
let root: Root;
const states: Array<{ completedPaths: string[] }> = [];
beforeEach(() => {
  states.length = 0;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      // The app shell provides one TooltipProvider for every block.
      <TooltipProvider>
        <DecisionTreeBlock decisionTree={tree} onStateChange={(s: { completedPaths: string[] }) => states.push(s)} />
      </TooltipProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const button = (title: string) => host.querySelector<HTMLButtonElement>(`button[title="${title}"]`)!;
const completedCount = () => {
  const label = [...host.querySelectorAll("span")].find((s) => s.textContent === "Completed");
  return label?.nextElementSibling?.textContent;
};

it("reaching an action is not completing it; Mark as Completed is", () => {
  expect(completedCount()).toBe("0");
  act(() => button("Yes").click());
  expect(host.textContent).toContain("Start the bisque firing");
  expect(completedCount()).toBe("0");
  expect(states.at(-1)?.completedPaths).toEqual([]);

  act(() => button("Mark as Completed").click());
  expect(completedCount()).toBe("1");
  expect(states.at(-1)?.completedPaths).toEqual(["fire"]);
});

// ── Review 5, G13 leftovers (2026-10-21): the two states the earlier fix shipped without a test ──

it("after Mark as Completed the button reads Completed, is disabled, and is no longer the green call to action", () => {
  act(() => button("Yes").click());
  const before = button("Mark as Completed");
  expect(before.disabled).toBe(false);
  expect(before.hasAttribute("data-decision-completed")).toBe(false);
  const callToActionLook = before.outerHTML.replace(/ title="[^"]*"| disabled=""| data-decision-completed=""/g, "").replace(/>[^<]*</g, "><");

  act(() => before.click());
  expect(host.querySelector('button[title="Mark as Completed"]')).toBeNull();
  const done = button("Completed");
  expect(done).not.toBeNull();
  expect(done.disabled).toBe(true);
  expect(done.hasAttribute("data-decision-completed")).toBe(true);
  const doneLook = done.outerHTML.replace(/ title="[^"]*"| disabled=""| data-decision-completed=""/g, "").replace(/>[^<]*</g, "><");
  expect(doneLook).not.toBe(callToActionLook);
  // A second press changes nothing: still one completed action.
  act(() => done.click());
  expect(completedCount()).toBe("1");
  expect(states.at(-1)?.completedPaths).toEqual(["fire"]);
});

it("the Decision Complete badge keeps its icon off the text (a gap-1.5 flex row, icon first)", () => {
  expect(host.querySelector('[title="Decision Complete"]')).toBeNull(); // no action reached yet
  act(() => button("Yes").click());
  const badge = host.querySelector<HTMLElement>('[title="Decision Complete"]')!;
  expect(badge).not.toBeNull();
  const classes = badge.className.split(/\s+/);
  expect(classes).toContain("gap-1.5");
  expect(classes).not.toContain("gap-1");
  expect(badge.firstElementChild?.querySelector("svg") ?? badge.firstElementChild).not.toBeNull();
  expect(badge.firstElementChild?.textContent).toBe(""); // the icon comes first, the words after it
  expect(badge.textContent).toContain("Decision Complete");
});
