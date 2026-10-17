/**
 * NARROW-FIXES item 2: in a Spaces database block at 768 beside the sidebar and at 375 the open view's tab
 * shrank to a blank pill or one letter, because the tab strip let every tab shrink to nothing inside an
 * overflow:hidden strip. Break named: the strip must not clip (it scrolls), a tab never shrinks, and the open
 * tab scrolls into view. jsdom has no layout, so the stylesheet's rules and the scroll call are pinned.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { ViewTab } from "../menu-parts";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const css = readFileSync(join(__dirname, "../../spaces.css"), "utf8");

it("the tab strip scrolls instead of clipping, and no tab shrinks below its name", () => {
  const strip = css.split("\n").find((l) => l.startsWith(".spaces-db-tabs {"))!;
  expect(strip).not.toMatch(/overflow:\s*hidden/);
  expect(strip).toMatch(/overflow-x:\s*auto/);
  expect(css).toMatch(/\.spaces-db-frame:not\(\[data-layout="chart"\]\) \.spaces-db-tabs > \* \{ flex: none; \}/);
});

it("the open tab scrolls itself into view and keeps its name as text", async () => {
  const scrolled: unknown[] = [];
  (Element.prototype as unknown as { scrollIntoView: (o: unknown) => void }).scrollIntoView = function (o) {
    scrolled.push([(this as HTMLElement).getAttribute("role"), o]);
  };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <ViewTab
        view={{ id: "v1", name: "Open pipeline deals", layout: "table" } as never}
        icon={null}
        active
        editable
        onSelect={() => {}}
        onRename={() => {}}
        onDuplicate={() => {}}
      />,
    );
  });
  const tab = host.querySelector('[role="tab"]') as HTMLElement;
  expect(tab.textContent).toBe("Open pipeline deals");
  expect(scrolled).toEqual([["tab", { inline: "nearest", block: "nearest" }]]);
  await act(async () => root.unmount());
});
