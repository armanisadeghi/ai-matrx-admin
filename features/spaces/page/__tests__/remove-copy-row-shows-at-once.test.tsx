/**
 * ADVERSARIAL-7 F7: "Remove template copy" arrived 2–6 s after the ••• menu opened (the page→install lookup ran on
 * open), so a person who did not see it chose Move to Trash. The lookup now starts when the page opens; while it has
 * not answered the menu shows the row, loading and not pressable, and once it has the row is the live item.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

jest.mock("../../editor/suggest", () => ({ useSuggesting: () => false, setSuggesting: () => undefined }));

import { PageMenu } from "../PageMenu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => undefined;
const settings = { font: "default", smallText: false, fullWidth: false, locked: false } as const;

async function menu(extra: { removeCopyPending?: boolean; onRemoveCopy?: () => void }) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  await act(async () => {
    root.render(
      createElement(PageMenu, {
        settings,
        onSettings: noop,
        onCopyLink: noop,
        onDuplicate: noop,
        onMove: noop,
        onDelete: noop,
        onUndo: noop,
        onHistory: noop,
        onExport: noop,
        onTemplate: noop,
        isTemplate: false,
        updatedLabel: "now",
        counts: { words: 0, characters: 0, blocks: 0 },
        ...extra,
      } as never),
    );
  });
  await act(async () => {
    (host.querySelector("button") as HTMLButtonElement).click();
  });
  const rows = () => [...document.querySelectorAll('[role="menuitem"]')].filter((r) => r.textContent?.includes("Remove template copy"));
  return { rows, done: () => act(async () => root.unmount()) };
}

describe("the ••• menu on a page", () => {
  it("shows Remove template copy at once, loading and not pressable, while the lookup is pending", async () => {
    const onRemoveCopy = jest.fn();
    const m = await menu({ removeCopyPending: true });
    expect(m.rows()).toHaveLength(1);
    expect(m.rows()[0].getAttribute("aria-busy")).toBe("true");
    await act(async () => (m.rows()[0] as HTMLElement).click());
    expect(onRemoveCopy).not.toHaveBeenCalled();
    await m.done();
  });

  it("shows the live item once the page is known to be a copy's root, and nothing on an ordinary page", async () => {
    const onRemoveCopy = jest.fn();
    const live = await menu({ onRemoveCopy });
    expect(live.rows()).toHaveLength(1);
    expect(live.rows()[0].getAttribute("aria-busy")).toBeNull();
    await act(async () => (live.rows()[0] as HTMLElement).click());
    expect(onRemoveCopy).toHaveBeenCalledTimes(1);
    await live.done();
    const plain = await menu({});
    expect(plain.rows()).toHaveLength(0);
    await plain.done();
  });
});
