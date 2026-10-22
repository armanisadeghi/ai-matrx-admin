/**
 * @jest-environment node
 */
// Audit #10 (custom-experience, 2026-10-22): on a phone a launchpad box grows to its content, and the counts
// strip's tiles (two a row) drew only after hydration — ~7 s on a cold phone — pushing every widget below it
// down (CLS 0.076–0.089, measured live on /launchpad/founder). The frame now reserves the body's own phone
// height in the FIRST HTML, so the box is already that tall before the body lands.
jest.mock("../widgets/bodies/KpisWidget", () => ({ KpisWidget: () => null }));
jest.mock("../widgets/bodies/MetricWidget", () => ({ MetricWidget: () => null }));
jest.mock("../widgets/bodies/RecentWidget", () => ({ RecentWidget: () => null }));
jest.mock("../widgets/bodies/TasksWidget", () => ({ TasksWidget: () => null }));
jest.mock("../widgets/bodies/AgendaWidget", () => ({ AgendaWidget: () => null }));
jest.mock("../widgets/bodies/FavoritesWidget", () => ({ FavoritesWidget: () => null }));
jest.mock("../widgets/bodies/AgentsWidget", () => ({ AgentsWidget: () => null }));
jest.mock("../widgets/bodies/PageWidget", () => ({ PageWidget: () => null }));
jest.mock("../widgets/bodies/TableWidget", () => ({ TableWidget: () => null }));
jest.mock("../widgets/bodies/AppletWidget", () => ({ AppletWidget: () => null }));
jest.mock("../widgets/bodies/LaunchpadLinkWidget", () => ({ LaunchpadLinkWidget: () => null }));
jest.mock("../widgets/bodies/AppPageWidget", () => ({ AppPageWidget: () => null }));
jest.mock("../widgets/bodies/MeetMatrxWidget", () => ({ MeetMatrxWidget: () => null }));
jest.mock("@ai-matrx/kit/media-query", () => ({ useIsMobile: () => false }));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { LaunchpadGrid } from "../components/LaunchpadGrid";
import { DEFAULT_KPI_KEYS, KPI_GAP_PX, KPI_TILE_PX, kpiPhoneBodyPx } from "../widgets/catalog";
import { addWidget, EMPTY_LAUNCHPAD_DOC } from "../doc";

describe("a phone launchpad reserves a content-sized body before it draws", () => {
  it("the counts strip's server HTML already holds its phone height", () => {
    const doc = addWidget(EMPTY_LAUNCHPAD_DOC, { id: "w_kpis", type: "kpis", config: { keys: DEFAULT_KPI_KEYS }, w: 12 }, 0);
    const html = renderToString(<LaunchpadGrid doc={doc} />);
    // Six counts, two a row: 3 rows of tiles, 2 gaps, and the body's 4px bottom padding.
    const px = 3 * KPI_TILE_PX + 2 * KPI_GAP_PX + 4;
    expect(kpiPhoneBodyPx({ keys: DEFAULT_KPI_KEYS })).toBe(px);
    expect(html).toContain(`--launchpad-phone-body:${px}px`);
    expect(html).toContain("@max-[40rem]/matrx-grid-canvas:min-h-(--launchpad-phone-body)");
  });

  it("a body that fills its box reserves nothing", () => {
    const doc = addWidget(EMPTY_LAUNCHPAD_DOC, { id: "w_tasks", type: "tasks", w: 6 }, 0);
    expect(renderToString(<LaunchpadGrid doc={doc} />)).not.toContain("--launchpad-phone-body");
  });

  it("the reserve counts only the counts the body draws", () => {
    expect(kpiPhoneBodyPx({ keys: "agents,notes,not_a_count" })).toBe(KPI_TILE_PX + 4);
    expect(kpiPhoneBodyPx({ keys: "agents,notes,tasks" })).toBe(2 * KPI_TILE_PX + KPI_GAP_PX + 4);
  });

  it("the counts body draws the geometry the reserve assumes, by the grid's own phone test", () => {
    const src = readFileSync(join(__dirname, "../widgets/bodies/KpisWidget.tsx"), "utf8");
    expect(src).toContain(`auto-rows-[${KPI_TILE_PX}px]`);
    expect(KPI_GAP_PX).toBe(4);
    expect(src).toMatch(/\bgap-1\b/);
    expect(src).toContain("grid-cols-2");
    // Viewport breakpoints (md:) disagree with the grid's container test at narrow panes.
    expect(src).not.toMatch(/\bmd:/);
  });
});
