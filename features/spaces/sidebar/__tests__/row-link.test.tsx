/**
 * Sidebar page rows are real links (ADVERSARIAL-1 #10): a cmd/ctrl/shift/middle click is left to the browser (new
 * tab), right-click has the browser's "Open in new tab", and a plain click is the app's own (open in place).
 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { RowLink, rowClickIsPlain } from "../row-link";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(row: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(row));
  return { host, done: () => act(async () => root.unmount()) };
}

it("the row carries a real anchor to the page", async () => {
  const { host, done } = await mount(<RowLink id="abc-123" title="Roadmap" />);
  const a = host.querySelector("a")!;
  expect(a.getAttribute("href")).toBe("/spaces/abc-123");
  expect(a.getAttribute("aria-label")).toBe("Roadmap");
  expect(a.draggable).toBe(false);
  await done();
});

it("a plain click is the row's (default prevented, bubbles); a modified click is the browser's (default kept, stopped)", async () => {
  const row = jest.fn();
  const { host, done } = await mount(
    <div onClick={row}>
      <RowLink id="abc-123" title="Roadmap" />
    </div>,
  );
  const a = host.querySelector("a")!;
  const plain = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  a.dispatchEvent(plain);
  expect(plain.defaultPrevented).toBe(true);
  expect(row).toHaveBeenCalledTimes(1);
  for (const mod of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }]) {
    const e = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...mod });
    a.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  }
  expect(row).toHaveBeenCalledTimes(1); // none of the modified clicks also navigated in place
  await done();
});

it("rowClickIsPlain: only an unmodified left click", () => {
  const base = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  expect(rowClickIsPlain(base)).toBe(true);
  expect(rowClickIsPlain({ ...base, button: 1 })).toBe(false);
  expect(rowClickIsPlain({ ...base, metaKey: true })).toBe(false);
  expect(rowClickIsPlain({ ...base, altKey: true })).toBe(false);
});
