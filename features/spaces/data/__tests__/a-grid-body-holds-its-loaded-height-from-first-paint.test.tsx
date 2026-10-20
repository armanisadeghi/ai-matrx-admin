/**
 * @jest-environment jsdom
 */
// A GRID BODY HOLDS ITS LOADED HEIGHT FROM FIRST PAINT (lane DB-BLOCK-CHROME-4, 2026-10-19).
//
// Measured on a fresh Fundraising CRM install (Cap table, admin and member, 1600/768/375): the callout under the
// database block moved three times as the block loaded — the first paint's skeleton body was 286 px, the live
// grid's own loading state 226 px ("Not live" note, no header, no footer), the loaded grid 278 px (310 px on a
// phone, which draws a 32 px tools row). CLS 0.006 to 0.017. Now the first paint's shape and the live grid's
// body carry ONE number — `embeddedGridBodyPx(rows)`, the loaded body — and the shape is pinned to it.
// Fails on the old code: no `data-reserve`, no `--spaces-db-body-min`, no pinned rule in spaces.css.

jest.mock("../../page/SpaceIcon", () => ({ SpaceIcon: () => null }));

import { embeddedGridBodyPx } from "@ai-matrx/records-ui/skeleton";
import { ExpectedRows } from "@ai-matrx/records-ui/skeleton";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { gridBodyReservePx, ReservedBody } from "../database-body-reserve";
import { DatabaseFrameShape } from "../database-frame-shape";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let mount: HTMLDivElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  mount?.remove();
  mount = null;
});
const render = (node: React.ReactNode) => {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  act(() => root!.render(node));
  return mount;
};

const grid = { source: { kind: "table", tableId: "t1" }, title: "Cap table", views: [{ id: "a", name: "Holders", layout: "grid" }], activeViewId: "a" };
const minOf = (el: Element | null) => (el as HTMLElement | null)?.style.getPropertyValue("--spaces-db-body-min");

describe("a grid body holds its loaded height", () => {
  it("is the loaded embedded grid's body for the rows the person sees", () => {
    expect(gridBodyReservePx(5)).toBe(embeddedGridBodyPx(5));
    expect(gridBodyReservePx(500)).toBe(embeddedGridBodyPx(50));
    expect(gridBodyReservePx(0)).toBeNull();
    expect(gridBodyReservePx(null)).toBeNull();
  });

  it("the first paint's shape and the live body carry the SAME number", () => {
    const shape = render(<DatabaseFrameShape p={grid} role={{ shape: true, published: false }} rows={5} />);
    const shapeBody = shape.querySelector(".spaces-db-body");
    expect(shapeBody?.hasAttribute("data-reserve")).toBe(true);
    expect(minOf(shapeBody)).toBe(`${embeddedGridBodyPx(5)}px`);

    act(() => root!.unmount());
    mount?.remove();
    const live = render(
      <ExpectedRows rows={5} groups={null}>
        <ReservedBody grid>
          <span />
        </ReservedBody>
      </ExpectedRows>,
    );
    const liveBody = live.querySelector(".spaces-db-body");
    expect(minOf(liveBody)).toBe(minOf(shapeBody));
  });

  it("holds nothing when the rows are not known, for another layout, or once the person presses in the block", () => {
    const unknown = render(
      <ExpectedRows rows={null} groups={null}>
        <ReservedBody grid>
          <span />
        </ReservedBody>
      </ExpectedRows>,
    );
    expect(unknown.querySelector(".spaces-db-body")?.hasAttribute("data-reserve")).toBe(false);
    act(() => root!.unmount());
    mount?.remove();

    const board = render(
      <ExpectedRows rows={5} groups={null}>
        <ReservedBody grid={false}>
          <span />
        </ReservedBody>
      </ExpectedRows>,
    );
    expect(board.querySelector(".spaces-db-body")?.hasAttribute("data-reserve")).toBe(false);
    act(() => root!.unmount());
    mount?.remove();

    const live = render(
      <ExpectedRows rows={5} groups={null}>
        <ReservedBody grid>
          <button type="button" id="b">
            x
          </button>
        </ReservedBody>
      </ExpectedRows>,
    );
    const body = live.querySelector(".spaces-db-body")!;
    expect(body.hasAttribute("data-reserve")).toBe(true);
    act(() => {
      live.querySelector("#b")!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(live.querySelector(".spaces-db-body")!.hasAttribute("data-reserve")).toBe(false);
  });

  it("spaces.css pins the shape to the number and floors the live body at it, plus the phone's tools row", () => {
    const css = readFileSync(join(__dirname, "../../spaces.css"), "utf8");
    expect(css).toMatch(/\.spaces-db-body\[data-reserve\]\s*\{\s*min-height:\s*var\(--spaces-db-body-min\)/);
    expect(css).toMatch(/\[data-frame-shape\]\s*\.spaces-db-body\[data-reserve\]\s*\{\s*height:\s*var\(--spaces-db-body-min\)/);
    expect(css).toMatch(/max-width:\s*639px\)\s*\{[^}]*min-height:\s*calc\(var\(--spaces-db-body-min\)\s*\+\s*32px\)/);
  });
});
