/**
 * @jest-environment jsdom
 */
/**
 * THE LIBRARY'S VIEW IS THE ADDRESS (walk-core 2026-10-18): picking System and searching
 * "safety" left the URL at /agents/prompt-blocks, so a reload or a shared link lost both.
 * Opening `?lane=system&q=safety` must open that lane with that search, and picking a lane
 * must write it.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const SYSTEM_ORG = "39c38960-d30c-4840-b0c1-c9960de95582";
const BLOCKS = [
  { id: "b1", name: "Safety rails", label: "", description: null, organization_id: SYSTEM_ORG, visibility: "public", created_by: null, source_kind: "block", bound_tool: null },
  { id: "b2", name: "Tone guide", label: "", description: null, organization_id: SYSTEM_ORG, visibility: "public", created_by: null, source_kind: "block", bound_tool: null },
  { id: "b3", name: "Org intro", label: "", description: null, organization_id: "org-1", visibility: "organization", created_by: "u2", source_kind: "block", bound_tool: null },
];
jest.mock("../blocksCache", () => ({ loadBlocks: () => Promise.resolve(BLOCKS), invalidateBlocks: () => undefined }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "u1", useAppDispatch: () => () => undefined }));
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/features/shell/components/header/RouteHeader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/lib/entity-list/RowSelectionBar", () => ({
  RowSelectionBar: () => null,
  useRowSelection: () => ({ rows: [], has: () => false, toggle: () => undefined, toggleAll: () => undefined, setMany: () => undefined, clear: () => undefined, allSelected: false, someSelected: false }),
}));
jest.mock("@/lib/entity-list/standardBulkActions", () => ({ standardBulkActionsFor: () => [] }));
jest.mock("next/navigation", () => ({ useSearchParams: () => null }));

import { PromptBlockLibrary } from "../components/PromptBlockLibrary";

let container: HTMLDivElement;
let root: Root;
const flush = async () => {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.history.replaceState(null, "", "/");
});

it("opens the lane and search the address names", async () => {
  window.history.replaceState(null, "", "/agents/prompt-blocks?lane=system&q=safety");
  act(() => root.render(<PromptBlockLibrary />));
  await flush();
  expect(container.querySelector('[data-testid="prompt-block-lane-system"]')).not.toBeNull();
  expect(container.querySelector<HTMLInputElement>('input[aria-label="Search blocks"]')?.value).toBe("safety");
  expect(container.textContent).toContain("Safety rails");
  expect(container.textContent).not.toContain("Tone guide");
});

it("writes the lane it is switched to", async () => {
  window.history.replaceState(null, "", "/agents/prompt-blocks");
  act(() => root.render(<PromptBlockLibrary />));
  await flush();
  const system = [...container.querySelectorAll<HTMLElement>('[role="tab"], button')].find((el) =>
    (el.textContent ?? "").startsWith("System"),
  );
  act(() => system?.click());
  await flush();
  expect(new URLSearchParams(window.location.search).get("lane")).toBe("system");
});
