/**
 * "Try advanced reader" — what the person SEES (2026-10-19 lane reader-fix):
 * the price before the click, the reader · seconds · points line after, and a huge page drawn in
 * slices (a whole 300-page read in one render froze the browser twice).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { RENDER_CHARS, type AdvancedItem } from "../contract";

jest.mock("@ai-matrx/chat/ui/markdown-stream/MarkdownStream", () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <pre data-testid="md">{content}</pre>,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/clipboard/copy", () => ({ copyToClipboard: jest.fn() }));
jest.mock("../../library/hooks", () => ({ useLibraryOrganizationId: () => "org-1" }));
jest.mock("../useAdvanced", () => ({
  useAdvancedQuote: () => ({
    data: {
      allow: "fast",
      items: [{ url: "https://g2.com/x", coverage: [], wouldTry: ["unlocker"], pointsUpTo: 12 }],
      pointsUpToTotal: 12,
      limitApplied: null,
    },
  }),
}));

import { AdvancedReadButton } from "../AdvancedReadButton";
import { AdvancedReadResult } from "../AdvancedReadResult";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
function mount(node: React.ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(node));
}
afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = undefined as unknown as Root;
});

const item = (over: Partial<AdvancedItem> = {}): AdvancedItem => ({
  url: "https://g2.com/x", ok: true, service: "unlocker", reader: "advanced reader", seconds: 27, points: 12,
  title: "t", text: "hello", markdown: null, recordCount: null, message: "", tried: [], ...over,
});

describe("advanced reader UI", () => {
  it("keeps the price behind a Cost door, never printed beside the button", () => {
    mount(<AdvancedReadButton url="https://g2.com/x" />);
    const quote = container.querySelector("[data-advanced-read-quote]");
    expect(quote).not.toBeNull();
    expect(quote?.textContent).not.toMatch(/point|pts/i);
    expect(container.querySelector("[data-action=advanced-read]")).not.toBeNull();
  });

  it("shows reader and seconds on a success, never points (law 14)", () => {
    mount(<AdvancedReadResult item={item()} />);
    expect(container.textContent).toContain("Advanced reader · 27.0 s");
    expect(container.textContent).not.toContain("point");
  });

  it("draws a huge page in slices with Show more", () => {
    mount(<AdvancedReadResult item={item({ text: "x".repeat(RENDER_CHARS * 3) })} />);
    expect(container.querySelector("[data-testid=md]")?.textContent?.length).toBe(RENDER_CHARS);
    act(() => (container.querySelector("[data-action=advanced-read-more]") as HTMLButtonElement).click());
    expect(container.querySelector("[data-testid=md]")?.textContent?.length).toBe(RENDER_CHARS * 3);
    expect(container.querySelector("[data-action=advanced-read-more]")).toBeNull();
  });
});
