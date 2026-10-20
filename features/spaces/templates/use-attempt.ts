// features/spaces/templates/use-attempt.ts — ONE install attempt from a template link (/spaces/use-template?template=…
// &attempt=<id>). ADVERSARIAL-4 N2/N3: a refresh, a restored tab or a second press on the same link made a second
// copy, because the page-run journal is cleared on success and nothing remembered that THIS link had already made
// one. The attempt id lives in the URL (so a refresh keeps it; a new press on the public page gets a new one), and
// this record lives in localStorage under it: the run's pages and table copy while it runs (a refresh RESUMES the
// same copy through template_install_fresh's p_install_id), then the made root once it is done (a refresh OPENS
// that copy and never installs again).

import type { SpaceId } from "../contract";
import type { PackRun, PackRunJournal } from "./use-pack";

export interface UseAttempt {
  /** The template row this attempt installs (a resume keeps the version it started with). */
  templateId: string;
  /** The made root page (known from the first page write). */
  root: SpaceId | null;
  /** The fresh table copy (known from the install door's first answer). */
  installId: string | null;
  /** The run finished: the attempt's copy exists and a revisit opens it. */
  done: boolean;
  /** The unfinished page run, for a resume. */
  run: PackRun | null;
}

const KEY = (attemptId: string) => `matrx:spaces:use-attempt:${attemptId}`;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const browserStorage = (): Storage | null => (typeof window === "undefined" ? null : window.localStorage);

export function readAttempt(attemptId: string, storage: Storage | null = browserStorage()): UseAttempt | null {
  const raw = storage?.getItem(KEY(attemptId));
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Partial<UseAttempt>;
    if (typeof a.templateId !== "string") return null;
    return { templateId: a.templateId, root: a.root ?? null, installId: a.installId ?? null, done: !!a.done, run: a.run ?? null };
  } catch {
    return null;
  }
}

function writeAttempt(attemptId: string, a: UseAttempt, storage: Storage | null) {
  try {
    storage?.setItem(KEY(attemptId), JSON.stringify(a));
  } catch {
    // A full storage only loses the resume, never the install.
  }
}

/** A new attempt id for a link visit (put in the URL with router.replace). */
export const newAttemptId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * The page-run journal of one attempt. Unlike packRunJournal it is never forgotten: success (write(null)) marks the
 * attempt done and keeps its root, and the table copy's install id is kept from the door's FIRST answer — before
 * any page exists — so a refresh at any point continues the same copy.
 */
export function attemptJournal(attemptId: string, templateId: string, storage: Storage | null = browserStorage()): PackRunJournal {
  const current = (): UseAttempt => readAttempt(attemptId, storage) ?? { templateId, root: null, installId: null, done: false, run: null };
  return {
    read: () => {
      const a = current();
      return a.done ? null : a.run ? { ...a.run, installId: a.run.installId ?? a.installId } : null;
    },
    write: (run) => {
      const a = current();
      writeAttempt(
        attemptId,
        run
          ? { ...a, run, root: run.root, installId: run.installId ?? a.installId, done: false }
          : { ...a, run: null, done: true },
        storage,
      );
    },
    installId: () => current().installId,
    noteInstallId: (id) => writeAttempt(attemptId, { ...current(), installId: id }, storage),
  };
}

/** The made root of a finished attempt on this browser whose table copy is one of `installIds` (newest first). */
export function attemptRootFor(installIds: readonly string[], storage: (Storage & { length: number; key(i: number): string | null }) | null = typeof window === "undefined" ? null : window.localStorage): SpaceId | null {
  if (!storage) return null;
  for (const installId of installIds) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith("matrx:spaces:use-attempt:")) continue;
      const a = readAttempt(key.slice("matrx:spaces:use-attempt:".length), storage);
      if (a?.done && a.root && a.installId === installId) return a.root;
    }
  }
  return null;
}
