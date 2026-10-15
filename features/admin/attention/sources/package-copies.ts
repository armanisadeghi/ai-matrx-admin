/**
 * "Package copies in apps" on the attention dock — the PURE half. A REPORT, never a gate
 * (typescript-package-standard rule 13: rules are enforced when a package is RELEASED; an app that
 * still holds a copy of package code, calls the database around @ai-matrx/data, or imports a
 * package's internals is told here, and nothing blocks).
 *
 * One item per app, severity `info` (listed last, never turns the dock red). The numbers come from
 * `scripts/report-package-copies.mjs`; a probe that could not run is `null` and the row says so
 * instead of showing zero.
 */

import type { AttentionItem } from "../types";

export const PACKAGE_COPIES_SOURCE_ID = "package-copies";
export const PACKAGE_COPIES_SOURCE_LABEL = "Package copies in apps";

export interface PackageCopiesAppReport {
  /** Local definitions of package logic: `open` re-grown, `census` known and waiting to collapse. */
  twins: { open: number; census: number } | null;
  /** Direct database calls outside @ai-matrx/data. */
  db: { calls: number; files: number } | null;
  /** Imports of a package subpath its `exports` map does not declare. */
  deep: { subpaths: number; files: number; examples: string[] } | null;
}

export interface PackageCopiesReport {
  generatedAt: string;
  apps: Record<string, PackageCopiesAppReport>;
}

function phrases(app: PackageCopiesAppReport): string[] {
  const out: string[] = [];
  out.push(app.twins === null ? "copies: not measured" : `${app.twins.open + app.twins.census} copies of package code`);
  out.push(app.db === null ? "database calls: not measured" : `${app.db.calls} direct database calls`);
  out.push(app.deep === null ? "deep imports: not measured" : `${app.deep.subpaths} imports into package internals`);
  return out;
}

function total(app: PackageCopiesAppReport): number {
  return (app.twins ? app.twins.open + app.twins.census : 0) + (app.db?.calls ?? 0) + (app.deep?.subpaths ?? 0);
}

export function packageCopiesItems(
  report: PackageCopiesReport | null,
  deps: { muteLocally: (key: string, ms: number) => void; unmuteLocally: (key: string) => void; now?: number },
): AttentionItem[] {
  if (!report) return [];
  const now = deps.now ?? Date.now();
  return Object.entries(report.apps)
    .filter(([, app]) => total(app) > 0 || app.twins === null || app.db === null || app.deep === null)
    .map(([name, app]) => {
      // One key per app and report, so muting this report never silences the next one.
      const key = `${PACKAGE_COPIES_SOURCE_ID}:${name}:${report.generatedAt}`;
      const state = phrases(app).join(" · ");
      return {
        key,
        sourceId: PACKAGE_COPIES_SOURCE_ID,
        id: `${name}:${report.generatedAt}`,
        severity: "info" as const,
        title: `Package copies in ${name}`,
        state,
        sentence: `${name} still holds code a package owns, or reaches around one. Packages are checked when they are released; this app is only told, and nothing is blocked.`,
        about: null,
        fix: "Move the code onto its package and delete the copy: agents work this list from the package-copies report.",
        record: null,
        doors: [],
        impactDeclared: null,
        actions: [],
        copy: {
          label: "Package copies",
          human: () => `Package copies in ${name} (report of ${report.generatedAt}): ${state}`,
          agent: () => ({
            kind: "package-copies",
            location: name,
            description:
              "Counts of code in an app that a package already owns (twins), direct database calls outside @ai-matrx/data, and imports of a package subpath it does not export. Re-run scripts/report-package-copies.mjs for the live numbers.",
            attributes: { generatedAt: report.generatedAt },
            data: app,
          }),
        },
        mute: {
          scope: "local" as const,
          current: null,
          apply: async (untilMs: number) => {
            deps.muteLocally(key, Math.max(0, untilMs - now));
          },
          clear: async () => {
            deps.unmuteLocally(key);
          },
        },
      } satisfies AttentionItem;
    });
}

export function summarizePackageCopies(items: readonly AttentionItem[]): string | null {
  return items.length > 0 ? "Apps still hold copies of package code." : null;
}
