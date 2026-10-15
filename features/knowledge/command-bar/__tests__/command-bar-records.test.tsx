/** @jest-environment jsdom */
//
// ⌘K RECORDS (lane AT-RECORD item 5): typing a name in the bar lists matching RECORDS across every table
// she can open, each with its table's name, and ↵ opens the record's own page. The store's search door
// is the only thing doubled (`recordsSearch`); the bar, its query parser and cmdk are real.
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppStore: () => ({ getState: () => ({}) }),
  useAppSelector: () => false,
}));
// The chat package reads these hooks through its own module (P3): one double covers both.
jest.mock("@ai-matrx/chat/store/hooks", () => jest.requireMock("@/lib/redux/hooks"));
jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import KnowledgeCommandBar from "../KnowledgeCommandBar";
import { createFixtureRunner } from "@/features/knowledge/api/knowledgeSearchFixture";
import type { KnowledgeSearchRunner } from "@/features/knowledge/api/knowledgeSearch";

class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
Element.prototype.scrollIntoView = jest.fn();
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

import * as tablesSource from "@/features/unified-data/home/dataHomeTablesSource";
import { corpus } from "@/features/unified-data/home/__tests__/fixtures";
import type { TablesModule } from "../KnowledgeCommandBar";
import type { DataHomeRow } from "@/features/unified-data/home/dataHomeRows";

let container: HTMLDivElement;
let root: Root;
let runner: jest.MockedFunction<KnowledgeSearchRunner>;

const HITS = [
  { recordId: "r1", tableId: "t-orders", tableName: "Wholesale Orders", name: "Harbor Hardware, order 1042" },
  { recordId: "r2", tableId: "t-customers", tableName: "Customers", name: "Harbor Hardware" },
];

function mount(recordsSearch: (text: string) => Promise<typeof HITS>) {
  act(() => {
    root.render(
      <KnowledgeCommandBar isOpen onClose={jest.fn()} callbackGroupId={null} runner={runner} recordsSearch={recordsSearch} />,
    );
  });
}
const input = () => document.querySelector<HTMLInputElement>('[data-testid="knowledge-command-input"]')!;
const recordsGroup = () =>
  (document.querySelector('[data-testid="command-bar-records"]')?.closest("[cmdk-group]") as HTMLElement | null) ?? null;
function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function settle(ms = 400) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

beforeEach(() => {
  push.mockClear();
  runner = jest.fn(createFixtureRunner());
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("⌘K lists records across tables, each with its table's name", () => {
  it("lists hits under Records with the table's name, and ↵ opens the record's own page", async () => {
    const ask = jest.fn(async () => HITS);
    mount(ask);
    await settle();
    expect(recordsGroup()).toBeNull();
    type("harbor hardware");
    await settle();
    expect(ask).toHaveBeenCalledWith("harbor hardware");
    const items = Array.from(recordsGroup()!.querySelectorAll<HTMLElement>("[cmdk-item]"));
    expect(items[0]!.textContent).toContain("Harbor Hardware, order 1042");
    expect(items[0]!.textContent).toContain("Wholesale Orders");
    act(() => items[0]!.click());
    expect(push).toHaveBeenCalledWith("/data/t-orders/r/r1");
  });

  it("one typed letter asks nothing", async () => {
    const ask = jest.fn(async () => HITS);
    mount(ask);
    await settle();
    type("h");
    await settle();
    expect(ask).not.toHaveBeenCalled();
  });

  it("a refused search shows the store's words, never an empty list", async () => {
    const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mount(async () => Promise.reject(new Error("Could not search records. permission denied")));
    await settle();
    type("harbor");
    await settle();
    expect(recordsGroup()!.querySelector("[role='alert']")?.textContent).toContain("permission denied");
    quiet.mockRestore();
  });
});
