/**
 * TROUBLESHOOTING WITH NO SYMPTOMS SHOWS NOTHING INVENTED (review 5, 2026-10-21).
 *
 * Source with a heading and bullets but no Symptom keeps its lines as written. The block still said
 * "0 issues found" beside the filters and "0 issues, 0 solutions" under the lines: counts of things
 * the source never named. With no issues the block draws the lines and neither count.
 *
 * RED on the old code: both counts were drawn.
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
jest.mock("@/features/tasks/components/ImportTasksModal", () => ({ __esModule: true, default: () => null }));
(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

import { TooltipProvider } from "@/components/ui/tooltip";
import TroubleshootingBlock from "../TroubleshootingBlock";
import { parseTroubleshootingMarkdown } from "../parseTroubleshootingMarkdown";

let host: HTMLDivElement;
let root: Root;
const draw = (markdown: string) => {
  const data = parseTroubleshootingMarkdown(markdown);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <TooltipProvider>
        <TroubleshootingBlock troubleshooting={data as never} />
      </TooltipProvider>,
    ),
  );
};
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("lines with no symptom are drawn as written, with no '0 issues' counts", () => {
  draw("### The app will not start\n- Check the cable\n- Restart the router\n");
  expect(host.textContent).toContain("Check the cable");
  expect(host.textContent).toContain("Restart the router");
  expect(host.textContent).not.toMatch(/\b0 issues?\b/);
  expect(host.textContent).not.toMatch(/\b0 solutions?\b/);
  expect(host.textContent).not.toMatch(/issues? found/);
});

it("a real symptom still shows its counts", () => {
  draw("**Symptom:** The app is slow\n**Solution:** Restart it\n1. Close the app\n2. Open it again\n");
  expect(host.textContent).toMatch(/1 issue\b/);
  expect(host.textContent).toMatch(/issues? found/);
});
