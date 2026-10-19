/**
 * @jest-environment jsdom
 */
// A DATABASE BLOCK'S FIRST PAINT IS ITS FINAL HEIGHT (lane DB-BLOCK-CHROME-2, 2026-10-19).
//
// Slow-4G probes of a Spaces page (DB-BLOCK-CHROME) found two causes of layout shift around database blocks:
//  1. GROW-THEN-SHRINK. A block was held at a STORED painted size (its last save's `paintedSize`, or this
//     device's localStorage) and let go up to 4 s later. A table that no longer opens draws a one-line note
//     under a 496 px hold taken when it had rows, and everything below jumped ~250 px when the hold ended.
//     The server already knows each block's rows (rows_visible), cards per column and whether its table opens,
//     so those blocks are drawn at that height from the first frame and no stored size is held.
//  2. EMPTY FIRST PAINT. When the browser draws the static first paint itself (the page's streamed boundary
//     was client-rendered on slow 4G), the "kept as served" host had no server HTML to keep: every database
//     block was 0 px until the editor took over. It now draws the block's frame at its known height.
// Each test fails on the old code.

jest.mock("../../page/SpaceIcon", () => ({ SpaceIcon: () => null }));
jest.mock("../../data/DatabaseBlock", () => ({
  DatabaseBlock: () => <div className="spaces-db-frame">live block</div>,
}));

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { SpaceSeedProvider, useHeightKnown } from "../../page/space-seed-context";
import { DatabaseHost, staticPaintedCss, type PaintedSize } from "../database-host";
import { DatabaseLoadingBox } from "../database-loading-box";
import { ServerDrawnDatabase } from "../server-drawn-database";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let mount: HTMLDivElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  mount?.remove();
  mount = null;
  window.localStorage.clear();
});
const render = (node: ReactNode) => {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  act(() => root!.render(node));
  return mount;
};

// Painted at this window's width (jsdom: 1024) when the table still had rows: 496 px.
const PAINTED: PaintedSize[] = [{ w: 0, h: 496, vw: 1024, nr: 1 }];
const block = (layout = "grid") => ({
  source: { kind: "table", tableId: "t1" },
  title: "Investors",
  views: [{ id: "a", name: "All investors", layout }],
  activeViewId: "a",
  paintedSize: PAINTED,
});

describe("a table that does not open draws its note from the first frame", () => {
  it("the loading box is the note, not a frame held at the stored 496 px", () => {
    const el = render(
      <SpaceSeedProvider expectedNotes={{ b1: "not-given" }}>
        <DatabaseLoadingBox blockId="b1" p={block()} />
      </SpaceSeedProvider>,
    );
    expect(el.querySelector(".spaces-db-note")?.textContent).toBe("This database isn’t shared with you.");
    expect(el.querySelector("[data-frame-shape]")).toBeNull();
    expect(el.innerHTML).not.toContain("496");
  });

  it("a table the store could not answer for draws the note with Try again (DataMount's own)", () => {
    const el = render(
      <SpaceSeedProvider expectedNotes={{ b1: "unavailable" }}>
        <DatabaseLoadingBox blockId="b1" p={block()} />
      </SpaceSeedProvider>,
    );
    expect(el.querySelector(".spaces-db-note")?.textContent).toContain("This database can’t be opened right now.");
    expect(el.querySelector(".spaces-db-note button")?.textContent).toBe("Try again");
  });
});

describe("no stored size is held when the live answers give the height", () => {
  const hostHeld = (el: HTMLElement) => (el.querySelector<HTMLElement>(".spaces-db-host")?.style.height ?? "");

  it("rows known: the host never holds the stored 496 px", () => {
    const el = render(
      <SpaceSeedProvider expectedRows={{ b1: 3 }}>
        <DatabaseHost blockId="b1" layout="grid" painted={PAINTED}>
          <div style={{ height: 10 }} />
        </DatabaseHost>
      </SpaceSeedProvider>,
    );
    expect(hostHeld(el)).toBe("");
  });

  it("a note known: the host never holds the stored 496 px", () => {
    const el = render(
      <SpaceSeedProvider expectedNotes={{ b1: "not-given" }}>
        <DatabaseHost blockId="b1" layout="grid" painted={PAINTED}>
          <div style={{ height: 10 }} />
        </DatabaseHost>
      </SpaceSeedProvider>,
    );
    expect(hostHeld(el)).toBe("");
  });

  it("nothing known (a filtered view): the stored size still holds it, as before", () => {
    const el = render(
      <SpaceSeedProvider>
        <DatabaseHost blockId="b1" layout="grid" painted={PAINTED}>
          <div style={{ height: 10 }} />
        </DatabaseHost>
      </SpaceSeedProvider>,
    );
    expect(hostHeld(el)).toBe("496px");
  });

  it("rows known: the loading frame carries no stored min-height", () => {
    const el = render(
      <SpaceSeedProvider expectedRows={{ b1: 3 }}>
        <DatabaseLoadingBox blockId="b1" p={block()} />
      </SpaceSeedProvider>,
    );
    expect(el.querySelector<HTMLElement>("[data-frame-shape]")?.style.minHeight).toBe("");
  });

  it("the static first paint writes no stored min-height rule for a block whose height is known", () => {
    const blocks = [{ id: "b1", type: "database", props: { data: JSON.stringify({ props: block() }) } }];
    const dataOf = (raw: unknown) => (JSON.parse(String(raw)) as { props: Record<string, unknown> }).props;
    let css = "";
    function Css() {
      css = staticPaintedCss(blocks, dataOf, useHeightKnown());
      return null;
    }
    render(
      <SpaceSeedProvider>
        <Css />
      </SpaceSeedProvider>,
    );
    expect(css).toContain("min-height:496px");
    act(() =>
      root!.render(
        <SpaceSeedProvider expectedRows={{ b1: 3 }}>
          <Css />
        </SpaceSeedProvider>,
      ),
    );
    expect(css).not.toContain("min-height:496px");
  });
});

describe("a static first paint the browser draws itself still shows its database blocks", () => {
  it("client-rendered (no server HTML to keep): the host draws the block's frame with the rows it will show", () => {
    const el = render(
      <SpaceSeedProvider expectedRows={{ b1: 3 }}>
        <ServerDrawnDatabase blockId="b1" p={block()} />
      </SpaceSeedProvider>,
    );
    const host = el.querySelector(".spaces-db-host");
    expect(host?.innerHTML).not.toBe("");
    expect(host?.querySelector("[data-frame-shape]")).not.toBeNull();
    expect(el.textContent).not.toContain("live block");
  });
});
