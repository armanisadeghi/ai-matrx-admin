/**
 * A board is its own design system (2026-10-18): component samples on a board draw in the board's
 * design-token tables, not the app's.
 *
 * SUT: `items/board-token-tables.ts` (`boardTokenTableIds`: which table tiles are token tables, in
 * reading order) and `items/data-items.tsx` `SectionWithBoardTokens` (a section body wraps its card in
 * records-ui's `TableTokensProvider` fed with the board's token tables).
 * Breaks it catches: the provider not wired (samples fall back to the app's tokens); a non-token table
 * (components, notes) fed as tokens; reading order lost (a later chapter must win a shared name); the
 * same table fed twice.
 */

jest.mock("@/features/data-tables/records-ui-host/recordsUiLazy", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const stub = (name: string) => {
    const Stub = (props: Record<string, unknown>) =>
      React.createElement("div", { "data-stub": name, "data-props": JSON.stringify({ ...props, children: undefined }) }, props.children as never);
    Stub.displayName = name;
    return Stub;
  };
  return {
    Peek: stub("Peek"),
    RecordsMount: stub("RecordsMount"),
    SectionCard: stub("SectionCard"),
    TableTokensProvider: stub("TableTokensProvider"),
    TablesHome: stub("TablesHome"),
  };
});

import { act } from "react";
import { createRoot } from "react-dom/client";
import { BoardTokenTablesContext, boardTokenTableIds } from "../items/board-token-tables";
import { SectionWithBoardTokens } from "../items/data-items";
import { TABLE_ENTITY } from "../items/table-tile";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const table = (id: string, tableId: string, y: number, look?: string) => ({
  id,
  rect: { x: 0, y, w: 1000, h: 200 },
  source: { kind: "entity", entity: TABLE_ENTITY, id: tableId, meta: { layout: "section", ...(look ? { look } : {}) } },
});

describe("a board's design tokens", () => {
  it("lists token tables only, in reading order, once each", () => {
    const tiles = [
      table("c", "components", 900, "html_sample"),
      table("s", "spacing", 600, "measure_spacing"),
      table("k", "colors", 0, "color_pair"),
      table("t", "type", 300, "type_style"),
      table("k2", "colors", 1200, "color_pair"),
      table("n", "plain", 1500),
      { id: "w", rect: { x: 0, y: 50, w: 10, h: 10 }, source: { kind: "text", meta: null } },
    ];
    expect(boardTokenTableIds(tiles)).toEqual(["colors", "type", "spacing"]);
  });

  it("a section on a board with token tables draws inside TableTokensProvider fed with them", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() =>
      root.render(
        <BoardTokenTablesContext.Provider value={["colors", "spacing"]}>
          <SectionWithBoardTokens tableId="components" />
        </BoardTokenTablesContext.Provider>,
      ),
    );
    const provider = host.querySelector("[data-stub='TableTokensProvider']");
    expect(provider).not.toBeNull();
    expect(JSON.parse(provider!.getAttribute("data-props")!).tableIds).toEqual(["colors", "spacing"]);
    expect(provider!.querySelector("[data-stub='SectionCard']")).not.toBeNull();
    act(() => root.unmount());
  });

  it("off a board (no token tables) the section is the plain card", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<SectionWithBoardTokens tableId="components" />));
    expect(host.querySelector("[data-stub='TableTokensProvider']")).toBeNull();
    expect(host.querySelector("[data-stub='SectionCard']")).not.toBeNull();
    act(() => root.unmount());
  });
});
