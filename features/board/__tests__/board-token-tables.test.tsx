/**
 * A board is its own design system (2026-10-18): component samples on a board draw in the board's
 * design-token tables, not the app's.
 *
 * SUT: `items/board-token-tables.ts` (`boardTokenTableIds`: which table tiles are token tables, in
 * reading order, by adopted look OR by the pack token stamped at install) and `items/data-items.tsx`
 * `BoardTokensMount` (ONE records-ui `TableTokensProvider` around every tile of the board, so the cover and
 * any sample read the board's tokens; a section adds none of its own).
 * Breaks it catches: the provider not wired (samples fall back to the app's tokens); a non-token table
 * (components, notes) fed as tokens; reading order lost (a later chapter must win a shared name); the
 * same table fed twice.
 */

jest.mock("@/features/organizations/useOrganizationRequired", () => ({
  useOrganizationRequired: () => ({ organizationState: "ready", organizationId: "org-1" }),
}));
jest.mock("@/features/data-tables/records-ui-host/recordsUiHost", () => ({
  useAppRecordsConfig: () => ({ dataSource: {} }),
  useRecordsUiPorts: () => ({}),
  recordsUiHostFor: () => ({}),
}));
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
import { BoardTokensMount, SectionWithBoardTokens, tileNameOf } from "../items/data-items";
import { TABLE_ENTITY, entityTableOf } from "../items/table-tile";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const table = (id: string, tableId: string, y: number, look?: string, token?: string) => ({
  id,
  rect: { x: 0, y, w: 1000, h: 200 },
  source: { kind: "entity", entity: TABLE_ENTITY, id: tableId, meta: { layout: "section", ...(look ? { look } : {}), ...(token ? { table_token: token } : {}) } },
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

  it("a freshly installed board (no look adopted yet) still knows its token tables by their pack token", () => {
    const tiles = [table("k", "colors", 0, undefined, "color"), table("c", "components", 300, undefined, "component"), table("m", "motion", 600, undefined, "motion")];
    expect(boardTokenTableIds(tiles)).toEqual(["colors", "motion"]);
  });

  it("the whole board sits inside ONE TableTokensProvider fed with its token tables", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() =>
      root.render(
        <BoardTokensMount tableIds={["colors", "spacing"]}>
          <SectionWithBoardTokens tableId="components" />
          <div data-cover="" />
        </BoardTokensMount>,
      ),
    );
    const providers = host.querySelectorAll("[data-stub='TableTokensProvider']");
    expect(providers).toHaveLength(1);
    expect(JSON.parse(providers[0]!.getAttribute("data-props")!).tableIds).toEqual(["colors", "spacing"]);
    expect(providers[0]!.querySelector("[data-stub='SectionCard']")).not.toBeNull();
    expect(providers[0]!.querySelector("[data-cover]")).not.toBeNull();
    act(() => root.unmount());
  });

  it("a section adds no provider of its own", () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<SectionWithBoardTokens tableId="components" />));
    expect(host.querySelector("[data-stub='TableTokensProvider']")).toBeNull();
    expect(host.querySelector("[data-stub='SectionCard']")).not.toBeNull();
    act(() => root.unmount());
  });

  it("a custom Table tile carrying a pack token is still its own table, never a missing schema table", () => {
    // Regression 2026-10-19: a stamped `meta.token` beside the table id made every fresh board's table read
    // "There is no table called color".
    expect(entityTableOf({ kind: "entity", entity: TABLE_ENTITY, id: "tbl-1", meta: { token: "color" } } as never)).toBeNull();
    expect(entityTableOf({ kind: "entity", entity: TABLE_ENTITY, id: "tbl-1", meta: { table_token: "color" } } as never)).toBeNull();
    expect(entityTableOf({ kind: "entity", entity: TABLE_ENTITY, id: null, meta: { token: "web_brand_choice" } } as never)).toEqual({ token: "web_brand_choice" });
    // Boards made on 2026-10-19 (token beside an id) still feed their token tables.
    expect(boardTokenTableIds([{ id: "k", rect: { x: 0, y: 0, w: 1, h: 1 }, source: { kind: "entity", entity: TABLE_ENTITY, id: "colors", meta: { token: "color" } } }])).toEqual(["colors"]);
  });

  it("a fresh copy's table reads by its own name on its board, never '<Table> · <board title>'", () => {
    const pack = { kind: "entity", entity: TABLE_ENTITY, id: "t", meta: { table_token: "color" } } as never;
    const plain = { kind: "entity", entity: TABLE_ENTITY, id: "t", meta: {} } as never;
    expect(tileNameOf("Colors · Acme design system", pack)).toBe("Colors");
    expect(tileNameOf("Colors", pack)).toBe("Colors");
    expect(tileNameOf("Q3 · Sales", plain)).toBe("Q3 · Sales");
  });
});
