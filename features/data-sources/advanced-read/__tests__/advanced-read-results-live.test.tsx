/**
 * A batch's advanced answers must appear on screen as they land (2026-10-19): the header counted
 * "2 read" while the rows and the results stayed as they were. The components re-read the store
 * from the version `useReadVersion()` returns, so a landed answer re-renders them.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { AdvancedItem } from "../contract";

jest.mock("@ai-matrx/chat/ui/markdown-stream/MarkdownStream", () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => <pre>{content}</pre>,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/clipboard/copy", () => ({ copyToClipboard: jest.fn() }));

const answer = (url: string): AdvancedItem => ({
  url, ok: true, service: "unlocker", reader: "advanced reader", seconds: 3, points: 30,
  title: "Notion reviews", text: "4.5 stars", markdown: null, recordCount: null, message: "", tried: [],
});
jest.mock("../server", () => ({
  quoteAdvancedRead: jest.fn(),
  runAdvancedRead: jest.fn(async (opts: { urls: string[]; onItem: (i: AdvancedItem) => void }) => {
    opts.urls.forEach((u) => opts.onItem(answer(u)));
    return [];
  }),
}));

import { AdvancedReadResults } from "../AdvancedReadResults";
import { startAdvancedRead } from "../store";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("shows each answer under the batch as soon as it lands", async () => {
  const urls = ["https://www.g2.com/products/notion/reviews", "https://www.instagram.com/natgeo/"];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => root.render(<AdvancedReadResults urls={urls} />));
  expect(container.querySelector("[data-advanced-read-results]")).toBeNull();

  await act(async () => {
    startAdvancedRead({ organizationId: "org-1", urls, allow: "fast" });
  });
  expect(container.querySelectorAll("[data-advanced-read-result=done]").length).toBe(2);
  expect(container.textContent).toContain("4.5 stars");
  act(() => root.unmount());
  container.remove();
});
