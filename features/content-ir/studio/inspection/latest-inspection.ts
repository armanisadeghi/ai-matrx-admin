/**
 * Pure reading of `content_ir.render_inspection` rows for one kind component
 * (legible-diagrams L7b). The server writes one row per capture (width x theme)
 * per round, `subject_ref = "kind_component:<component id>"`, and each row's
 * `measurements` is `{ "<width>:<theme>": inspection.v1 | { error } }`.
 */

import { issuesOf, type Inspection } from "@ai-matrx/alchemy/operate/inspect";

export const KIND_COMPONENT_SUBJECT_PREFIX = "kind_component:";

export interface InspectionRow {
  id: string;
  subject_ref: string;
  round: number;
  measurements: unknown;
  screenshot_file_id: string | null;
  created_at: string;
}

export interface InspectionCapture {
  rowId: string;
  /** "light 1440px" */
  where: string;
  theme: string;
  width: number;
  /** null = the capture could not run (see `error`). */
  problems: number | null;
  error: string | null;
  screenshotFileId: string | null;
}

export interface LatestInspection {
  round: number;
  createdAt: string;
  captures: InspectionCapture[];
  /** Problems across the captures that ran. */
  problems: number;
  /** Captures that could not run. */
  failed: number;
}

export function subjectRefOf(componentId: string): string {
  return `${KIND_COMPONENT_SUBJECT_PREFIX}${componentId}`;
}

function isInspection(m: unknown): m is Inspection {
  if (!m || typeof m !== "object") return false;
  const r = m as Record<string, unknown>;
  return (
    Array.isArray(r.text) &&
    Array.isArray(r.overlaps) &&
    Array.isArray(r.outOfBounds) &&
    Array.isArray(r.crossings) &&
    Array.isArray(r.labelOnLine) &&
    Array.isArray(r.contrast) &&
    Array.isArray(r.consoleErrors)
  );
}

/** One capture's problem count, or the reason it has none. */
export function readCapture(
  rowId: string,
  key: string,
  measurement: unknown,
  screenshotFileId: string | null,
): InspectionCapture {
  const [widthText = "0", theme = ""] = key.split(":");
  const width = Number.parseInt(widthText, 10) || 0;
  const where = `${theme} ${width}px`.trim();
  if (isInspection(measurement)) {
    const report = (measurement as unknown as { shapeReport?: { error?: unknown } }).shapeReport;
    const reportProblem = report && typeof report.error === "string" && report.error ? 1 : 0;
    return {
      rowId,
      where,
      theme,
      width,
      problems: issuesOf(measurement).total + reportProblem,
      error: null,
      screenshotFileId,
    };
  }
  const reason =
    measurement && typeof measurement === "object" && typeof (measurement as { error?: unknown }).error === "string"
      ? String((measurement as { error: string }).error)
      : "No measurement was stored for this capture.";
  return { rowId, where, theme, width, problems: null, error: reason, screenshotFileId };
}

/** The newest round across the rows, flattened to one entry per capture. Null = never inspected. */
export function latestInspectionOf(rows: readonly InspectionRow[]): LatestInspection | null {
  if (rows.length === 0) return null;
  const round = Math.max(...rows.map((r) => r.round));
  const newest = rows.filter((r) => r.round === round);
  const captures: InspectionCapture[] = [];
  for (const row of newest) {
    const entries =
      row.measurements && typeof row.measurements === "object"
        ? Object.entries(row.measurements as Record<string, unknown>)
        : [];
    if (entries.length === 0) {
      captures.push(readCapture(row.id, "0:", null, row.screenshot_file_id));
      continue;
    }
    for (const [key, measurement] of entries) {
      captures.push(readCapture(row.id, key, measurement, row.screenshot_file_id));
    }
  }
  captures.sort((a, b) => a.width - b.width || a.theme.localeCompare(b.theme));
  return {
    round,
    createdAt: newest.map((r) => r.created_at).sort().at(-1) ?? "",
    captures,
    problems: captures.reduce((sum, c) => sum + (c.problems ?? 0), 0),
    failed: captures.filter((c) => c.problems === null).length,
  };
}
