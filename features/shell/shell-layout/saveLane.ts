// features/shell/shell-layout/saveLane.ts — how a person's own layout saves follow each other (live walk
// 2026-10-20). Two promises:
//
//   1. A PERSON'S OWN CONSECUTIVE EDITS NEVER CONFLICT WITH THEMSELVES. Saves run one at a time, and each
//      reads the row it must not overwrite (its version) and builds its body when its turn comes — never
//      from what the screen held at the click. Before, choosing "Use system" theme and then a custom
//      accent (Enter, then the field's blur as it went disabled) sent two writes with the same version:
//      the second was refused "This layout was changed somewhere else".
//   2. OPTIMISTIC. An `optimistic` save is drawn at once (the slice's preview body: the real shell wears
//      it — accent, look — before the store answers, instead of ~1.6 s later). When the last queued
//      save settles, the preview steps aside and the shell draws what the store holds: the new layout,
//      or — if the write was refused — the one before it (the caller toasts the refusal).
//
// Pure over its deps so the order is tested without a records client (`__tests__/save-lane.test.ts`).

import type { ShellLayoutBody, StoredShellLayout } from "./contract";
import type { ShellLayoutResult } from "./service";
import { parseShellLayoutBody, serializeShellLayoutBody } from "./validate";

/** A body, or how to make it from the layout as it stands when the save's turn comes (null = none yet). */
export type ShellLayoutBodyInput = ShellLayoutBody | ((current: ShellLayoutBody | null) => ShellLayoutBody);

export interface ShellLayoutSaveDeps {
  /** The stored row as it is NOW (read when the save's turn comes, never captured at the click). */
  readCurrent(): StoredShellLayout | null;
  /** The compare-and-swap write against `current`. */
  write(current: StoredShellLayout | null, body: ShellLayoutBody): Promise<ShellLayoutResult<StoredShellLayout>>;
  /** A write landed: hold the new row (the next queued save reads it). */
  stored(row: StoredShellLayout): void;
  /** The live preview the shell draws (null = none). */
  readPreview(): string | null;
  setPreview(text: string | null): void;
}

export interface ShellLayoutSaveLane {
  save(deps: ShellLayoutSaveDeps, body: ShellLayoutBodyInput, options?: { optimistic?: boolean }): Promise<ShellLayoutResult<StoredShellLayout>>;
}

function bodyOf(row: StoredShellLayout | null): ShellLayoutBody | null {
  return row ? parseShellLayoutBody(row.body).body : null;
}

const build = (input: ShellLayoutBodyInput, current: ShellLayoutBody | null): ShellLayoutBody =>
  typeof input === "function" ? input(current) : input;

export function createShellLayoutSaveLane(): ShellLayoutSaveLane {
  let tail: Promise<unknown> = Promise.resolve();
  // Optimistic saves in flight, the preview that was showing before the first of them, and the body the
  // person last asked for (the next click builds on it, so quick choices add up instead of replacing).
  let inFlight = 0;
  let priorPreview: string | null = null;
  let intended: ShellLayoutBody | null = null;

  return {
    save(deps, input, options = {}) {
      if (options.optimistic) {
        if (inFlight === 0) {
          priorPreview = deps.readPreview();
          intended = bodyOf(deps.readCurrent());
        }
        inFlight += 1;
        intended = build(input, intended);
        deps.setPreview(serializeShellLayoutBody(intended));
      }
      const run = async (): Promise<ShellLayoutResult<StoredShellLayout>> => {
        const current = deps.readCurrent();
        const answer = await deps.write(current, build(input, bodyOf(current)));
        if (answer.ok) deps.stored(answer.data);
        return answer;
      };
      const settle = () => {
        if (!options.optimistic) return;
        inFlight -= 1;
        if (inFlight === 0) {
          intended = null;
          deps.setPreview(priorPreview);
        }
      };
      const next = tail.then(run, run).then(
        (answer) => {
          settle();
          return answer;
        },
        (error: unknown) => {
          settle();
          return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
        },
      );
      tail = next;
      return next;
    },
  };
}

/** The page's one lane: every person-layout save in this tab goes through it. */
export const shellLayoutSaveLane = createShellLayoutSaveLane();
