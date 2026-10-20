/**
 * DATA-HOME-2 — THE HOME ASKS `custom.my_levels` A FEW CALLS AT A TIME, AND ONCE PER TABLE.
 * One call per organization used to leave all of them in flight together (34 at once for one member), and
 * every render that changed the list asked again for the ids still waiting, so one organization was asked
 * thirteen times; together they ran past the statement timeout (57014, a 500 on /data).
 * TABLE-CREATE-SPEED: every row in hand goes in ONE `custom.my_levels_across` call, whatever organization it
 * lives in (it was one `custom.my_levels` call per organization: 13-27 calls per page for admin@admin.com).
 * Breaks named:
 * - one call per organization (12 organizations → 12 calls) instead of one per render that brings new rows → red.
 * - an id whose organization refused the ask is asked again (every render re-asks it) → red.
 * - more than three calls are out at one moment → red.
 * - a re-render with a changed list asks again for ids a call is already out for → red.
 * - an organization's answer is lost, or lands on the wrong table → red.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let inFlight = 0;
let peak = 0;
const calls: Array<{ organizationId: string; ids: string[] }> = [];
const releases: Array<() => void> = [];

const REFUSED_ORG = "org-11";
jest.mock("@/features/unified-data/hub/doors", () => ({
  restoreTableIn: jest.fn(),
  myLevelsAcross: (_ds: unknown, asks: Array<{ organization_id: string; ids: string[] }>) =>
    new Promise((resolve) => {
      calls.push({ organizationId: asks.map((a) => a.organization_id).join("|"), ids: asks.flatMap((a) => a.ids) });
      inFlight++;
      peak = Math.max(peak, inFlight);
      releases.push(() => {
        inFlight--;
        resolve({
          ok: true,
          data: asks.flatMap((a) =>
            a.ids.map((id) => ({ organization_id: a.organization_id, id, level: a.organization_id === REFUSED_ORG ? null : "viewer", refused: a.organization_id === REFUSED_ORG ? "This organization is archived" : null })),
          ),
        });
      });
    }),
}));
jest.mock("@ai-matrx/records/react", () => ({
  RecordsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRecordsClient: () => ({ config: { organizationId: null, dataSource: {} } }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock("@/features/unified-data/actions/useTableFavorite", () => ({ useStarToggle: () => ({ toggle: jest.fn() }) }));

// eslint-disable-next-line import/first
import { useTableLevels } from "../useDataHomeRowMenus";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tablesOf = (orgs: number) =>
  Array.from({ length: orgs }, (_, o) => ({ tableId: `00000000-0000-4000-8000-${String(o).padStart(12, "0")}`, organizationId: `org-${o}` }));

let seen: ReadonlyMap<string, unknown> = new Map();
function Probe({ tables }: { tables: ReturnType<typeof tablesOf> }) {
  seen = useTableLevels(tables);
  return null;
}

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(() => act(() => root.unmount()));

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("the home's level lookup", () => {
  it("asks every row in one call per render, each table once, keeps at most three calls out, and asks a refused one once", async () => {
    const first = tablesOf(10);
    await act(async () => root.render(<Probe tables={first} />));
    await settle();
    // the list grows while the first calls are still out: the ten already asked are not asked again
    await act(async () => root.render(<Probe tables={tablesOf(12)} />));
    await settle();
    expect(peak).toBeLessThanOrEqual(3);

    for (let guard = 0; guard < 40 && (releases.length > 0 || inFlight > 0); guard++) {
      const next = releases.shift();
      if (next) await act(async () => next());
      await settle();
    }

    const asked = calls.flatMap((c) => c.ids);
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked).toHaveLength(12);
    // twelve organizations, two renders that brought new rows: two calls, never one per organization
    expect(calls).toHaveLength(2);
    for (const t of tablesOf(12)) {
      if (t.organizationId === REFUSED_ORG) expect(seen.get(t.tableId)).toBeNull();
      else expect(seen.get(t.tableId)).toBe("viewer");
    }
    expect(peak).toBeLessThanOrEqual(3);
  });
});
