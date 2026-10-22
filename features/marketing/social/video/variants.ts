/** Pure rules of the variants panel: what a click will create, and what already exists (prod walk 1, defect 4). */

import type { ParamSet } from "./clone";
import { nameWithSuffix } from "./estimate";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Split the sets a person asked for into the ones that are new and the ones the project already has (a variant's
 * label is built from its overrides, so the same label is the same overrides). Repeats inside the request count once.
 */
export function splitNewSets(sets: readonly ParamSet[], existingLabels: readonly string[]): { fresh: ParamSet[]; reused: ParamSet[] } {
  const seen = [...existingLabels];
  const fresh: ParamSet[] = [];
  const reused: ParamSet[] = [];
  for (const s of sets) {
    if (seen.some((l) => same(l, s.label))) reused.push(s);
    else {
      fresh.push(s);
      seen.push(s.label);
    }
  }
  return { fresh, reused };
}

/** "variant" / "variants" with the number: the button says exactly how many it will make. */
export function countWord(n: number, noun = "variant"): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** The create button's text for what the click does, or null when there is nothing to create. */
export function createButtonText(freshCount: number): string | null {
  return freshCount > 0 ? `Create ${countWord(freshCount)}` : null;
}

/** What the server did with a matrix: how many are new and how many were already there. */
export function matrixOutcomeText(made: ReadonlyArray<{ reused?: boolean }>): string {
  const reused = made.filter((m) => m.reused).length;
  const fresh = made.length - reused;
  if (fresh === 0) return reused === 1 ? "That variant already exists" : `All ${reused} already exist`;
  return reused ? `Created ${countWord(fresh)}; ${reused} already existed` : `Created ${countWord(fresh)}`;
}

/** The label of a variant card whose pin is behind the head. */
export function rebasedLabel(pin: number, head: number): string {
  return pin === head ? "" : `rebased from v${pin}`;
}

// ── the matrix (C6): hook lines x caption looks x shapes ───────────────────────────────────────────

/** The hook lines a person pasted: one per line, trimmed, empty lines and repeats dropped (case-insensitive), each cut to the field's 120. */
export function parseHookLines(text: string, max = 120): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\s+/g, " ").slice(0, max).trim();
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export interface MatrixAxes {
  hooks: readonly string[];
  looks: readonly string[];
  shapes: readonly string[];
}

/** How many variants the axes make: an empty axis is left out (it does not multiply by zero), no axis at all makes none. */
export function matrixSize(a: { hooks: number; looks: number; shapes: number }): number {
  const axes = [a.hooks, a.looks, a.shapes].filter((n) => n > 0);
  return axes.length ? axes.reduce((x, y) => x * y, 1) : 0;
}

const cut = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

/**
 * Every combination of the hook lines, caption looks and shapes as parameter sets. A one-axis row keeps the exact label
 * the single-row builder always made ("Hook: …", "Captions: …", "Shape 1:1"), so a variant made either way is the same
 * variant; a combination joins its parts with " · ". Labels are unique inside the matrix (two long hooks that start the
 * same are told apart by a number) because the project treats the same label as the same variant.
 */
export function buildMatrix(axes: MatrixAxes, lookLabel: (id: string) => string): ParamSet[] {
  const hooks: Array<string | null> = axes.hooks.length ? [...axes.hooks] : [null];
  const looks: Array<string | null> = axes.looks.length ? [...axes.looks] : [null];
  const shapes: Array<string | null> = axes.shapes.length ? [...axes.shapes] : [null];
  const out: ParamSet[] = [];
  const used = new Set<string>();
  for (const h of hooks) {
    for (const l of looks) {
      for (const s of shapes) {
        if (h === null && l === null && s === null) continue;
        const parts = [h !== null ? `Hook: ${cut(h, 40)}` : null, l !== null ? `Captions: ${lookLabel(l)}` : null, s !== null ? `Shape ${s}` : null].filter((p): p is string => p !== null);
        let label = parts.join(" · ");
        for (let n = 2; used.has(label.toLowerCase()); n++) label = `${parts.join(" · ")} #${n}`;
        used.add(label.toLowerCase());
        const set: ParamSet = { label };
        if (h !== null) set.hook_text = h;
        if (l !== null) set.caption_preset = l;
        if (s !== null) set.aspect = s as ParamSet["aspect"];
        out.push(set);
      }
    }
  }
  return out;
}

export interface BatchCounts {
  total: number;
  queued: number;
  rendering: number;
  rendered: number;
  failed: number;
  /** Rendered or failed: nothing more will happen to it. */
  finished: number;
}

/** Where every variant of a running batch stands, from the per-variant outcomes (a variant with no event yet is waiting in the queue). */
export function batchCounts(ids: readonly string[], outcome: Readonly<Record<string, { status: string } | undefined>>): BatchCounts {
  const c: BatchCounts = { total: ids.length, queued: 0, rendering: 0, rendered: 0, failed: 0, finished: 0 };
  for (const id of ids) {
    const s = outcome[id]?.status;
    if (s === "rendered") c.rendered++;
    else if (s === "failed") c.failed++;
    else if (s === "rendering") c.rendering++;
    else c.queued++;
  }
  c.finished = c.rendered + c.failed;
  return c;
}

/** "9 of 25 rendered · 6 rendering · 10 waiting · 1 failed": the one line that says where a long batch is. */
export function batchProgressText(c: BatchCounts): string {
  const parts = [`${c.rendered} of ${c.total} rendered`];
  if (c.rendering) parts.push(`${c.rendering} rendering`);
  if (c.queued) parts.push(`${c.queued} waiting`);
  if (c.failed) parts.push(`${c.failed} failed`);
  return parts.join(" · ");
}

/** The file name of the zip of a batch's videos. */
export function zipFileName(projectName: string): string {
  return nameWithSuffix(projectName, "variants").replace(/\.mp4$/, ".zip");
}

/** Each entry's name inside the zip, unique (two files never overwrite each other when unzipped). */
export function zipEntryNames(wanted: readonly string[]): string[] {
  const taken = new Set<string>();
  return wanted.map((name) => {
    let out = name;
    for (let n = 2; taken.has(out.toLowerCase()); n++) out = name.replace(/(\.[^.]+)?$/, ` ${n}$1`);
    taken.add(out.toLowerCase());
    return out;
  });
}

export type BatchStanding = "none" | "running" | "stopped" | "over";

/**
 * Is a batch the server holds still running, over, or stopped under us (a restart kills it without a word)? A batch beats every
 * 15 s while it runs; silent for 90 s it is stopped. A record from before beats existed (no beat at all) is stopped after 10 minutes.
 */
export function batchStanding(b: { status: string; createdAt: string; heartbeatAt: string | null } | null | undefined, now = Date.now()): BatchStanding {
  if (!b) return "none";
  if (b.status !== "processing") return "over";
  const last = Date.parse(b.heartbeatAt ?? b.createdAt);
  const quiet = now - (Number.isFinite(last) ? last : 0);
  return quiet > (b.heartbeatAt ? 90_000 : 600_000) ? "stopped" : "running";
}
