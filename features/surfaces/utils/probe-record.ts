/**
 * The latest probe record, read from `ui.ui_surface.last_check` (written by
 * `pnpm surface:probe`, scripts/surface-probe-record.ts; surface declarations W0-D).
 * `last_check` may also carry a certification ledger; only the probe's fields are read.
 */

export interface SurfaceProbeRecord {
  status: string;
  at: string | null;
  route: string | null;
  base: string | null;
  recordId: string | null;
  declaredOn: string[];
  required: string[];
  conditional: string[];
  suppliedValues: string[];
  suppliedEmpty: string[];
  missing: string[];
  conditionalMissing: string[];
  readMode: string | null;
  probedAs: { role: string | null; email: string | null; userId: string | null } | null;
  probeVersion: string | null;
  /** Values as the probe saw them, when a probe records them (none do yet). */
  values: Record<string, unknown> | null;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v ? v : null;
}

function record(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parse `last_check`; null when no probe ever wrote a status there. */
export function parseProbeRecord(lastCheck: unknown): SurfaceProbeRecord | null {
  const lc = record(lastCheck);
  if (!lc) return null;
  const status = str(lc.status);
  if (!status) return null;
  const probedAs = record(lc.probedAs);
  return {
    status,
    at: str(lc.at),
    route: str(lc.route),
    base: str(lc.base),
    recordId: str(lc.recordId),
    declaredOn: strings(lc.declaredOn),
    required: strings(lc.required),
    conditional: strings(lc.conditional),
    suppliedValues: strings(lc.suppliedValues),
    suppliedEmpty: strings(lc.suppliedEmpty),
    missing: strings(lc.missing),
    conditionalMissing: strings(lc.conditionalMissing),
    readMode: str(lc.readMode),
    probedAs: probedAs
      ? { role: str(probedAs.role), email: str(probedAs.email), userId: str(probedAs.userId) }
      : null,
    probeVersion: str(lc.probeVersion),
    values: record(lc.values),
  };
}

/** The probed page as a full URL (the probe stores base + route). */
export function probeUrl(p: SurfaceProbeRecord): string | null {
  if (!p.route) return null;
  return p.base ? `${p.base.replace(/\/$/, "")}${p.route}` : p.route;
}
