/**
 * Package copies on the attention dock: a REPORT. One info row per app, never critical, an
 * unmeasured probe is said rather than shown as zero, and a clean app has no row.
 */

import { packageCopiesItems, summarizePackageCopies, type PackageCopiesReport } from "../sources/package-copies";

const deps = { muteLocally: jest.fn(), unmuteLocally: jest.fn(), now: Date.parse("2026-10-15T20:00:00Z") };
const at = "2026-10-15T19:00:00Z";

const report = (apps: PackageCopiesReport["apps"]): PackageCopiesReport => ({ generatedAt: at, apps });

test("an app with copies, database calls and deep imports gets one info row with the counts", () => {
  const [item] = packageCopiesItems(
    report({ "matrx-frontend": { twins: { open: 2, census: 5 }, db: { calls: 40, files: 12 }, deep: { subpaths: 3, files: 2, examples: [] } } }),
    deps,
  );
  expect(item.severity).toBe("info");
  expect(item.state).toBe("7 copies of package code · 40 direct database calls · 3 imports into package internals");
  expect(item.actions).toEqual([]);
  expect(item.mute?.scope).toBe("local");
});

test("a probe that could not run is said, never shown as zero", () => {
  const [item] = packageCopiesItems(report({ app: { twins: null, db: { calls: 0, files: 0 }, deep: { subpaths: 0, files: 0, examples: [] } } }), deps);
  expect(item.state).toMatch(/copies: not measured/);
});

test("a measured clean app has no row, and the summary is empty at zero", () => {
  const items = packageCopiesItems(
    report({ app: { twins: { open: 0, census: 0 }, db: { calls: 0, files: 0 }, deep: { subpaths: 0, files: 0, examples: [] } } }),
    deps,
  );
  expect(items).toEqual([]);
  expect(summarizePackageCopies(items)).toBeNull();
});

test("a new report is a new key, so muting one never silences the next", () => {
  const app = { twins: { open: 1, census: 0 }, db: null, deep: null };
  const [a] = packageCopiesItems(report({ app }), deps);
  const [b] = packageCopiesItems({ generatedAt: "2026-10-16T00:00:00Z", apps: { app } }, deps);
  expect(a.key).not.toBe(b.key);
});
