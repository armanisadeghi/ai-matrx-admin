// The registry guard: every launchpad widget declares a Board section, sane grid sizes, a describe line and a body.
jest.mock("../bodies/KpisWidget", () => ({ KpisWidget: () => null }));
jest.mock("../bodies/MetricWidget", () => ({ MetricWidget: () => null }));
jest.mock("../bodies/RecentWidget", () => ({ RecentWidget: () => null }));
jest.mock("../bodies/TasksWidget", () => ({ TasksWidget: () => null }));
jest.mock("../bodies/AgendaWidget", () => ({ AgendaWidget: () => null }));
jest.mock("../bodies/FavoritesWidget", () => ({ FavoritesWidget: () => null }));
jest.mock("../bodies/AgentsWidget", () => ({ AgentsWidget: () => null }));
jest.mock("../bodies/PageWidget", () => ({ PageWidget: () => null }));
jest.mock("../bodies/TableWidget", () => ({ TableWidget: () => null }));
jest.mock("../bodies/AppletWidget", () => ({ AppletWidget: () => null }));
jest.mock("../bodies/LaunchpadLinkWidget", () => ({ LaunchpadLinkWidget: () => null }));
jest.mock("../bodies/AppPageWidget", () => ({ AppPageWidget: () => null }));
jest.mock("../bodies/DashboardWidget", () => ({ DashboardWidget: () => null }));
jest.mock("../bodies/BoardItemWidget", () => ({ BoardItemWidget: () => null }));
jest.mock("../bodies/KindWidget", () => ({ KindWidget: () => null }));
jest.mock("../bodies/SpacePageWidget", () => ({ SpacePageWidget: () => null }));

import { BOARD_SECTIONS } from "@/features/board/items/types";
import { LAUNCHPAD_WIDGET_CATALOG, describeLaunchpadWidget } from "../catalog";
import { LAUNCHPAD_WIDGETS, LAUNCHPAD_WIDGETS_WITHOUT_BODY } from "../registry";

const sectionKeys = BOARD_SECTIONS.map((s) => s.key as string);

describe("launchpad widget registry", () => {
  it("has a body for every catalog entry, and unique types", () => {
    expect(LAUNCHPAD_WIDGETS_WITHOUT_BODY).toEqual([]);
    expect(LAUNCHPAD_WIDGETS.map((w) => w.type)).toEqual(LAUNCHPAD_WIDGET_CATALOG.map((s) => s.type));
    expect(new Set(LAUNCHPAD_WIDGET_CATALOG.map((s) => s.type)).size).toBe(LAUNCHPAD_WIDGET_CATALOG.length);
  });

  it.each(LAUNCHPAD_WIDGET_CATALOG.map((s) => [s.type, s] as const))("%s declares section, sizes, describe, fields", (_k, spec) => {
    expect(sectionKeys).toContain(spec.section);
    const z = spec.sizes;
    expect(z.minW).toBeGreaterThanOrEqual(1);
    expect(z.defaultW).toBeGreaterThanOrEqual(z.minW);
    expect(z.defaultW).toBeLessThanOrEqual(z.maxW ?? 12);
    expect(z.defaultH).toBeGreaterThanOrEqual(z.minH);
    expect(z.defaultH).toBeLessThanOrEqual(z.maxH ?? Infinity);
    expect(typeof spec.describe(spec.defaultConfig)).toBe("string");
    for (const f of spec.fields) expect(f.key).toMatch(/^[a-zA-Z]+$/);
  });

  it("never asks a person to type an id: every *Id field is a picker", () => {
    const raw = LAUNCHPAD_WIDGET_CATALOG.flatMap((s) => s.fields.filter((f) => /Id$/.test(f.key) && !f.picker).map((f) => `${s.type}.${f.key}`));
    expect(raw).toEqual([]);
  });

  it("names an unknown widget instead of dropping it", () => {
    expect(describeLaunchpadWidget({ type: "gone", config: {} })).toBe('Unavailable widget "gone"');
  });

  it("folds in records-ui dashboards and every Board item (one registry, lane U)", () => {
    const types = LAUNCHPAD_WIDGETS.map((w) => w.type);
    expect(types).toEqual(expect.arrayContaining(["page", "records_dashboard", "board_item", "applet"]));
    expect(LAUNCHPAD_WIDGET_CATALOG.find((s) => s.type === "board_item")!.fields[0]!.picker).toBe("boardItem");
  });
});
