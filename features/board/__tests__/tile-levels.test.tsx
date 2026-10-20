/**
 * THE ZOOM LADDER (Arman, 2026-10-19: "We are not going straight from beautiful components to just ugly,
 * thick, dark labels").
 *
 * SUT: `engine/lod.ts` `detailLevelFor`, the camera store's per-tile level + body-wanted channels,
 * `BoardTile` (which face it draws, whether it mounts its body), every catalog type's L1 `structure`,
 * and the canvas words' ink bars (`components/lod/board-lod.css` `.board-ink`).
 * Breaks it catches: a level chosen by zoom alone (a huge tile at 15% shown as a card); a catalog type
 * with no skeleton and no reason; a skeleton that reads a store (it would throw outside Providers here);
 * a far-zoom tile that mounts its feature body anyway; sticky / text words with no bar fallback.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  CARD_MIN_SCREEN_H,
  CARD_MIN_SCREEN_W,
  INK_LEGIBLE_PX,
  OVERVIEW_ZOOM,
  STRUCTURE_MIN_SCREEN_H,
  STRUCTURE_MIN_SCREEN_W,
  detailLevelFor,
} from "../engine/lod";
import { BoardCameraStore } from "../engine/camera-store";
import { BoardCameraStoreContext, FocusHostContext } from "../engine/react";
import { BoardTile } from "../components/BoardTile";
import { BOARD_ITEM_TYPES } from "../items/catalog";
import { cardLinesFromBasics } from "../items/card-lines";
import type { BoardShape } from "../engine/shapes";
import { PlainText, StickyCard } from "../components/CanvasTextViews";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("the level is chosen by the tile's ON-SCREEN size", () => {
  it("full only while text is legible, whatever the size", () => {
    expect(detailLevelFor({ w: 200, h: 120 }, 1)).toBe("full");
    expect(detailLevelFor({ w: 200, h: 120 }, OVERVIEW_ZOOM)).toBe("full");
    expect(detailLevelFor({ w: 4000, h: 3000 }, OVERVIEW_ZOOM - 0.01)).not.toBe("full");
  });

  it("at one zoom a huge tile shows its structure, a mid one a card, a small one a label", () => {
    const z = 0.15;
    expect(detailLevelFor({ w: 2000, h: 1400 }, z)).toBe("structure");
    expect(detailLevelFor({ w: 800, h: 520 }, z)).toBe("card");
    expect(detailLevelFor({ w: 400, h: 300 }, z)).toBe("label");
  });

  it("thresholds are screen pixels", () => {
    const z = 0.5;
    expect(detailLevelFor({ w: STRUCTURE_MIN_SCREEN_W / z, h: STRUCTURE_MIN_SCREEN_H / z }, z)).toBe("structure");
    expect(detailLevelFor({ w: STRUCTURE_MIN_SCREEN_W / z - 2, h: 2000 }, z)).toBe("card");
    expect(detailLevelFor({ w: CARD_MIN_SCREEN_W / z, h: CARD_MIN_SCREEN_H / z }, z)).toBe("card");
    expect(detailLevelFor({ w: CARD_MIN_SCREEN_W / z - 2, h: 2000 }, z)).toBe("label");
  });

  it("the store tells each tile its own level and wakes only the tiles that crossed a threshold", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 1 });
    store.setSize({ w: 1600, h: 1000 });
    store.registerItem("big", { x: 0, y: 0, w: 2000, h: 1400 });
    store.registerItem("small", { x: 2100, y: 0, w: 400, h: 300 });
    const woke: string[] = [];
    store.subscribeLevel("big", () => woke.push("big"));
    store.subscribeLevel("small", () => woke.push("small"));
    store.setCamera({ x: 0, y: 0, z: 0.15 });
    store.recomputeCoarse();
    expect(store.getLevel("big")).toBe("structure");
    expect(store.getLevel("small")).toBe("label");
    expect(woke.sort()).toEqual(["big", "small"]);
    woke.length = 0;
    store.setCamera({ x: 10, y: 0, z: 0.151 });
    store.recomputeCoarse();
    expect(woke).toEqual([]);
  });
});

describe("the level follows the zoom the moment the camera moves (no animation frame needed)", () => {
  // Bug 2026-10-19: tiles stayed on Structure at 10% and 3% and never reached Label. The level was only
  // re-decided in a requestAnimationFrame; a pane that is not painting never ran it. These steps never
  // call recomputeCoarse and never flush a frame.
  const raf = globalThis.requestAnimationFrame;
  beforeEach(() => {
    globalThis.requestAnimationFrame = (() => 0) as unknown as typeof requestAnimationFrame;
  });
  afterEach(() => {
    globalThis.requestAnimationFrame = raf;
  });

  it("0.7 → 0.25 → 0.1 → 0.03 on tiles of several sizes", () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 0.7 });
    store.setSize({ w: 1600, h: 1000 });
    const sizes = {
      huge: { w: 2000, h: 1400 },
      big: { w: 1200, h: 800 },
      thousand: { w: 1000, h: 700 },
      note: { w: 560, h: 1000 },
      small: { w: 400, h: 300 },
    };
    for (const [id, s] of Object.entries(sizes)) store.registerItem(id, { x: 0, y: 0, ...s });
    const at = (z: number) => {
      store.setCamera({ x: 0, y: 0, z });
      return Object.fromEntries(Object.keys(sizes).map((id) => [id, store.getLevel(id)]));
    };
    expect(at(0.7)).toEqual({ huge: "full", big: "full", thousand: "full", note: "full", small: "full" });
    expect(at(0.25)).toEqual({ huge: "structure", big: "structure", thousand: "structure", note: "card", small: "label" });
    expect(at(0.1)).toEqual({ huge: "structure", big: "card", thousand: "label", note: "label", small: "label" });
    expect(at(0.03)).toEqual({ huge: "label", big: "label", thousand: "label", note: "label", small: "label" });
    expect(at(0.25).note).toBe("card");
    expect(at(0.7).huge).toBe("full");
  });

  it("a drawn tile swaps its face with the zoom and never keeps the old face over it", () => {
    jest.useFakeTimers();
    try {
      const store = new BoardCameraStore({ x: 0, y: 0, z: 0.25 });
      store.setSize({ w: 1600, h: 1000 });
      function H() {
        const [host, setHost] = useState<HTMLDivElement | null>(null);
        return (
          <BoardCameraStoreContext.Provider value={store}>
            <FocusHostContext.Provider value={host}>
              <div ref={setHost} />
              <BoardTile id="t" rect={{ x: 0, y: 0, w: 1200, h: 800 }} title="Plan" onResize={null} structure={<div />}>
                {() => <div />}
              </BoardTile>
            </FocusHostContext.Provider>
          </BoardCameraStoreContext.Provider>
        );
      }
      act(() => root.render(<H />));
      const faces = () => [...container.querySelectorAll("[data-lod-level]")].map((e) => e.getAttribute("data-lod-level"));
      expect(faces()).toEqual(["structure"]);
      act(() => store.setCamera({ x: 0, y: 0, z: 0.1 }));
      expect(faces()).toEqual(["card"]);
      act(() => store.setCamera({ x: 0, y: 0, z: 0.03 }));
      expect(faces()).toEqual(["label"]);
      // animationend never arrives in a pane that is not painting: the outgoing face must still go.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(container.querySelectorAll("[data-lod-leaving]").length).toBe(0);
      expect(faces()).toEqual(["label"]);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("below full detail a tile mounts no feature body", () => {
  function Harness({ store, onBody }: { store: BoardCameraStore; onBody: () => void }) {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    return (
      <BoardCameraStoreContext.Provider value={store}>
        <FocusHostContext.Provider value={host}>
          <div ref={setHost} />
          <BoardTile id="t" rect={{ x: 0, y: 0, w: 1600, h: 1200 }} title="Launch plan" onResize={null} structure={<div data-test-structure />}>
            {() => {
              onBody();
              return <div data-test-body>Body</div>;
            }}
          </BoardTile>
        </FocusHostContext.Provider>
      </BoardCameraStoreContext.Provider>
    );
  }

  it("a board opened far out draws faces only; getting close mounts the body, which then stays", async () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 0.2 });
    store.setSize({ w: 1600, h: 1000 });
    const onBody = jest.fn();
    act(() => root.render(<Harness store={store} onBody={onBody} />));
    act(() => store.recomputeCoarse());
    // 1600×1200 at 20% = 320×240 on screen: L1, the type's skeleton.
    expect(container.querySelector("[data-lod-level='structure'] [data-test-structure]")).not.toBeNull();
    expect(onBody).not.toHaveBeenCalled();
    expect(container.querySelector("[data-test-body]")).toBeNull();

    act(() => store.setCamera({ x: 0, y: 0, z: 0.08 }));
    act(() => store.recomputeCoarse());
    expect(container.querySelector("[data-lod-level='card'] [data-board-overview]")).not.toBeNull();
    act(() => store.setCamera({ x: 0, y: 0, z: 0.03 }));
    act(() => store.recomputeCoarse());
    expect(container.querySelector("[data-lod-level='label'] [data-board-label]")?.textContent).toContain("Launch plan");
    expect(onBody).not.toHaveBeenCalled();

    act(() => store.setCamera({ x: 0, y: 0, z: 1 }));
    act(() => store.recomputeCoarse());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container.querySelector("[data-test-body]")).not.toBeNull();
    expect(container.querySelector("[data-lod-level]")).toBeNull();

    // Zoomed out again: the body stays mounted (hidden), the face is drawn over it.
    act(() => store.setCamera({ x: 0, y: 0, z: 0.2 }));
    act(() => store.recomputeCoarse());
    expect(container.querySelector("[data-test-body]")).not.toBeNull();
    expect(container.querySelector("[data-lod-level='structure']")).not.toBeNull();
  });

  it("an agent holding the tile awake mounts its body at any zoom", async () => {
    const store = new BoardCameraStore({ x: 0, y: 0, z: 0.05 });
    store.setSize({ w: 1600, h: 1000 });
    const onBody = jest.fn();
    act(() => root.render(<Harness store={store} onBody={onBody} />));
    expect(container.querySelector("[data-test-body]")).toBeNull();
    act(() => {
      store.holdAwake("t");
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container.querySelector("[data-test-body]")).not.toBeNull();
  });
});

describe("every catalog type has its L1 skeleton", () => {
  it.each(BOARD_ITEM_TYPES.map((t) => [t.key, t]))("%s declares a structure or why it uses the generic one", (_key, type) => {
    if (type.structure) expect(typeof type.structure).toBe("function");
    else expect(type.structureGeneric?.trim().length ?? 0).toBeGreaterThan(10);
  });

  it.each(BOARD_ITEM_TYPES.filter((t) => t.structure).map((t) => [t.key, t]))(
    "%s skeleton renders from props alone (no Provider, no store, no fetch)",
    (_key, type) => {
      const fetchSpy = jest.fn();
      const prevFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      const S = type.structure!;
      act(() => root.render(<S source={{ kind: "entity", entity: type.key, id: "00000000-0000-0000-0000-000000000001" } as never} title="A title" />));
      globalThis.fetch = prevFetch;
      expect(container.innerHTML.length).toBeGreaterThan(50);
      // Words become bars: a skeleton prints no text of its own.
      expect(container.textContent?.trim()).toBe("");
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});

describe("the far-zoom card's facts come from saved basics", () => {
  it("keeps facts and an excerpt, drops ids, links, the title and the status", () => {
    const lines = cardLinesFromBasics(
      {
        active_task_title: "Ship the board",
        active_task_status: "active",
        active_task_priority: "High",
        active_task_due_date: "2026-10-21T00:00:00Z",
        task_id: "00000000-0000-0000-0000-000000000001",
        content: "## Plan\nWe zoom out and every tile still reads like what it is, with no ugly dark labels.",
        url: "https://example.com",
      },
      { title: "Ship the board" },
    );
    expect(lines[0]).toEqual({ label: null, value: expect.stringContaining("We zoom out") });
    expect(lines.map((l) => l.label)).toEqual([null, "Priority", "Due date"]);
  });
});

describe("file basics read as a person would say them", () => {
  it("size in KB/MB, the date without its clock, the mime type left out", () => {
    const lines = cardLinesFromBasics({
      file_name: "nist.pdf",
      file_mime_type: "application/pdf",
      file_size_bytes: 1040566,
      file_updated_at: "2026-10-10 06:15:59.262929+00:00",
    });
    expect(lines.map((l) => `${l.label} ${l.value}`)).toEqual(["Size 1016 KB", expect.stringMatching(/^Updated Oct (9|10)/)]);
  });
});

describe("words on the canvas turn into bars below legibility", () => {
  const css = readFileSync(join(__dirname, "../components/lod/board-lod.css"), "utf8");

  it("the ink rule switches at the legible size, from the board's zoom alone", () => {
    const rule = css.slice(css.indexOf(".board-ink {"));
    expect(rule).toContain(`var(--ink-px, 16) * var(--board-z, 1) - ${INK_LEGIBLE_PX}`);
    expect(rule).toContain("box-decoration-break: clone");
  });

  const shape = (kind: "sticky" | "text"): BoardShape =>
    ({ id: `s-${kind}`, kind, points: [{ x: 0, y: 0 }, { x: 200, y: 200 }], text: "Ideas for launch week", style: {} }) as unknown as BoardShape;

  it("a sticky's words sit in an ink span that knows its color and fitted size", () => {
    act(() => root.render(<StickyCard shape={shape("sticky")} box={{ x: 0, y: 0, w: 200, h: 200 }} editing={false} />));
    const card = container.querySelector<HTMLElement>("[data-board-sticky]")!;
    expect(card.style.getPropertyValue("--ink")).toContain("--board-sticky-ink");
    const ink = card.querySelector<HTMLElement>(".board-ink")!;
    expect(ink.textContent).toBe("Ideas for launch week");
    expect(Number(ink.parentElement!.style.getPropertyValue("--ink-px"))).toBeGreaterThan(0);
  });

  it("plain text's words sit in an ink span with its font size", () => {
    const board = { stampShape: jest.fn() } as never;
    act(() => root.render(<PlainText shape={shape("text")} box={{ x: 0, y: 0, w: 200, h: 40 }} board={board} editing={false} />));
    const el = container.querySelector<HTMLElement>("[data-board-text]")!;
    expect(Number(el.style.getPropertyValue("--ink-px"))).toBeGreaterThan(0);
    expect(el.querySelector(".board-ink")?.textContent).toBe("Ideas for launch week");
  });
});
