/**
 * V-4 (final review 2026-10-18): the cover drew its own absolutely placed "Edit" button, which sat over
 * the tile's "…" menu. Edit is now an entry in that one menu (`BoardItemType.menuActions`); the body has
 * no loose button, and choosing the entry opens the writing box.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { COVER_ITEMS, coverSource } from "../items/cover-items";

// The cover's prose is the board's one prose renderer (needs a live board viewport); this test is about the menu.
jest.mock("../tiles/MarkdownTileBody", () => ({ MarkdownTileBody: ({ text }: { text: string }) => <div>{text}</div> }));
jest.mock("@ai-matrx/records-ui/html-frame", () => ({
  HtmlSampleFrame: () => <div data-hero="" />,
  TokenScope: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/official/ProTextarea", () => ({
  ProTextarea: (p: { "aria-label": string; value: string }) => <textarea aria-label={p["aria-label"]} value={p.value} readOnly />,
}));

const cover = COVER_ITEMS[0];
const source = coverSource({ hero: "<b>Hero</b>", markdown: "# Title\n\nWhat this board is for." });

describe("the cover's Edit lives in the tile's one menu", () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("the body draws no Edit button; the menu entry opens the writing box", () => {
    const Body = cover.Body!;
    act(() =>
      root.render(
        <Body tileId="cover-1" source={source} title="Design system" tier="read" interacting={false} onSource={() => {}} />,
      ),
    );
    const buttons = [...host.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(buttons).not.toContain("Edit");
    expect(host.querySelector('[aria-label="Cover text"]')).toBeNull();

    const actions = cover.menuActions?.({ tileId: "cover-1", source, title: "Design system", onSource: () => {} }) ?? [];
    expect(actions.map((a) => a.label)).toEqual(["Edit"]);
    // Another tile's Edit never opens this cover.
    act(() => cover.menuActions!({ tileId: "other", source, title: "x", onSource: () => {} })[0].onSelect());
    expect(host.querySelector('[aria-label="Cover text"]')).toBeNull();
    act(() => actions[0].onSelect());
    expect(host.querySelector('[aria-label="Cover text"]')).not.toBeNull();
  });
});
