import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { resetAutoCleanHandled, useAutoCleanOnOpen } from "../useAutoCleanOnOpen";
import type { PdfDocument } from "../usePdfExtractor";

const doc = {
  id: "d-once",
  name: "a.pdf",
  content: "raw",
  cleanContent: null,
  mimeType: "application/pdf",
  totalPages: 3,
} as unknown as PdfDocument;

beforeEach(() => resetAutoCleanHandled());

it("two hook instances on one doc (desktop + mobile shell) fire exactly one auto-clean", () => {
  const run = jest.fn();
  const args = {
    doc,
    busy: false,
    pagesSettled: true,
    pagesHaveCleanText: false,
    runAnswered: true,
    run,
  };
  function Probe() {
    useAutoCleanOnOpen(args);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement("div", null, createElement(Probe), createElement(Probe))));
  expect(run).toHaveBeenCalledTimes(1);
  act(() => root.render(createElement("div", null, createElement(Probe), createElement(Probe))));
  expect(run).toHaveBeenCalledTimes(1);
});
