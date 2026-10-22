/** One reading of the estimate for every screen (plan page, project page, run log): what is left to make and its price. */

import { formatCount } from "@ai-matrx/kit/format";
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

/** Face tracking for captions that follow the speaker, as one cost-summary line: "Face tracking 306 points"; null when nothing needs it. */
export function facesCostLine(est: Pick<EstimateAnswer, "lines">): string | null {
  const lines = est.lines.filter((l) => l.capability === "faces");
  if (!lines.length) return null;
  const pts = lines.reduce((a, l) => a + (l.points ?? 0), 0);
  return pts > 0 ? `Face tracking ${formatCount(Math.round(pts))} points` : "Face tracking";
}

/** The line that tells the person when the studio stops to ask: "Asks before large spends". Null when the setting is unknown. */
export function confirmLine(est: Pick<EstimateAnswer, "confirm_over_points">): string | null {
  const pts = est.confirm_over_points;
  if (pts == null) return null;
  if (pts <= 0) return "Asks before every generation";
  return "Asks before large spends";
}

export interface OutputRow {
  fileId: string;
  label: string;
  /** The version this file was rendered from, when known. */
  version: number | null;
  /** True when the head has moved on since: the file is not what the preview shows. */
  stale: boolean;
  /** The variant that made this file (its label as it was when it rendered), recorded by the server; null for the project's own video. */
  variantLabel: string | null;
}

/**
 * The finished videos, newest first, each saying which version it was made from and whether the head has moved on.
 * The server lists renders in the order they were attached (oldest first), so the newest is found by the version it was
 * made from, and by position when a render has no version (a later one is newer).
 */
export function outputRows(answer: { output_file_ids: string[]; output_versions?: Record<string, number>; output_variants?: Record<string, { variant_id: string; label: string }>; head_version: number }): OutputRow[] {
  return answer.output_file_ids
    .map((fileId, index) => {
      const version = answer.output_versions?.[fileId] ?? null;
      const variantLabel = answer.output_variants?.[fileId]?.label ?? null;
      return { fileId, index, version, variantLabel, stale: version !== null && version < answer.head_version, label: version !== null ? `Made from v${version}` : `Render ${index + 1}` };
    })
    .sort((a, b) => (b.version ?? -1) - (a.version ?? -1) || b.index - a.index)
    .map(({ index: _index, ...row }) => row);
}

/** A file name for one variant's video: the project's name and the variant's label. */
export function variantDownloadName(projectName: string, variantLabel: string): string {
  return nameWithSuffix(projectName, variantLabel);
}

const HEAD_MAX = 28;
const TAIL_MAX = 56;
const unsafeName = (s: string): string => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
/** `s` shortened to at most `max` characters, at a word boundary (never mid-word, never a dangling half word). */
function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space >= max / 2 ? cut.slice(0, space) : s.slice(0, max)).trim();
}

/**
 * THE one place a "project name + suffix" file name is built. One rule for every file of a project: the name is cut at a
 * word boundary to the same length (so "Ranking tie Hook..." never turns into "Ranking ti Hook..." just because another
 * label is longer), the suffix (variant label, version, id tail) is cut at a word boundary to its own length. Two names
 * that still collide are told apart where they are collected (`finishedDownloadName`, `zipEntryNames`).
 */
export function nameWithSuffix(projectName: string, suffix: string): string {
  const tail = cutAtWord(unsafeName(suffix), TAIL_MAX);
  const head = cutAtWord(unsafeName(projectName), HEAD_MAX);
  return `${[head, tail].filter(Boolean).join(" ") || "video"}.mp4`;
}

/** A file name for a saved video: the video's name, safe for a file system. */
export function downloadName(name: string): string {
  const safe = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${safe || "video"}.mp4`;
}

/**
 * The download name of one row of the Finished list: the variant's label when the server recorded one, else the version,
 * always made unique among `taken` by the file's own id so two downloads never share a name.
 */
export function finishedDownloadName(projectName: string, row: Pick<OutputRow, "fileId" | "version" | "variantLabel">, taken: Set<string>): string {
  const suffix = row.variantLabel ?? (row.version !== null ? `v${row.version}` : "");
  let name = nameWithSuffix(projectName, suffix);
  if (taken.has(name)) name = nameWithSuffix(projectName, `${suffix} ${row.fileId.slice(0, 6)}`.trim());
  taken.add(name);
  return name;
}
