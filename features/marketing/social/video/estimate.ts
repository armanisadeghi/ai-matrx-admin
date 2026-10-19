/** One reading of the estimate for every screen (plan page, project page, run log): what is left to make and its price. */

import type { EstimateAnswer } from "./types";

export interface EstimateSummary {
  /** Items that will be made (and charged) now. */
  toMake: number;
  /** Items already made and reused for $0.00. */
  reused: number;
  usd: number;
  points: number;
}

/**
 * The server's lines are only what still has to run; `cached` lists what is already made. Totals cover the lines.
 * When the server names the counts itself (`to_make`, `reused`), those win.
 */
export function summarizeEstimate(est: EstimateAnswer & { to_make?: number; reused?: number }): EstimateSummary {
  return {
    toMake: typeof est.to_make === "number" ? est.to_make : est.lines.length,
    reused: typeof est.reused === "number" ? est.reused : est.cached.length,
    usd: est.total_usd,
    points: est.total_points,
  };
}

/** The label beside the price: "13 to make", "4 to make · 9 reused", "All made". */
export function estimateLabel(s: EstimateSummary): string {
  if (s.toMake === 0) return s.reused > 0 ? `${s.reused} reused` : "All made";
  return s.reused > 0 ? `${s.toMake} to make · ${s.reused} reused` : `${s.toMake} to make`;
}

/** The line that tells the person when the studio stops to ask: "Asks before spending over 20,000 points". Null when the setting is unknown. */
export function confirmLine(est: Pick<EstimateAnswer, "confirm_over_points">): string | null {
  const pts = est.confirm_over_points;
  if (pts == null) return null;
  if (pts <= 0) return "Asks before every generation";
  return `Asks before spending over ${Math.round(pts).toLocaleString("en-US")} points`;
}

export interface OutputRow {
  fileId: string;
  label: string;
  /** The version this file was rendered from, when known. */
  version: number | null;
  /** True when the head has moved on since: the file is not what the preview shows. */
  stale: boolean;
}

/**
 * The finished videos, newest first, each saying which version it was made from and whether the head has moved on.
 * The server lists renders in the order they were attached (oldest first), so the newest is found by the version it was
 * made from, and by position when a render has no version (a later one is newer).
 */
export function outputRows(answer: { output_file_ids: string[]; output_versions?: Record<string, number>; head_version: number }): OutputRow[] {
  return answer.output_file_ids
    .map((fileId, index) => {
      const version = answer.output_versions?.[fileId] ?? null;
      return { fileId, index, version, stale: version !== null && version < answer.head_version, label: version !== null ? `Made from v${version}` : `Render ${index + 1}` };
    })
    .sort((a, b) => (b.version ?? -1) - (a.version ?? -1) || b.index - a.index)
    .map(({ index: _index, ...row }) => row);
}

/** A file name for one variant's video: the project's name and the variant's label. */
export function variantDownloadName(projectName: string, variantLabel: string): string {
  return downloadName(`${projectName} ${variantLabel}`);
}

/** A file name for a saved video: the video's name, safe for a file system. */
export function downloadName(name: string): string {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${safe || "video"}.mp4`;
}
