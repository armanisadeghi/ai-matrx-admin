/**
 * The deck editor's save path. Every save writes the WHOLE deck, so two writes in flight at once
 * can land out of order and an older deck (fewer slides) wins — saves therefore run one at a time,
 * and each one writes the newest deck when it starts. A reload, tab switch or close flushes at
 * once and the browser asks before leaving while a save is pending or still unwritten (a flush is
 * a request, not a guarantee) — the same rule as the document editor's `listenToPage`.
 */

export type DeckSaveState = "saved" | "dirty" | "saving" | "error";

export interface DeckSaverDeps<D> {
  /** The editor's current revision and deck, read together at the moment a save starts. */
  current: () => { revision: number; deck: D };
  /** Write the deck; true when it landed. */
  write: (deck: D) => Promise<boolean>;
  onState?: (state: DeckSaveState) => void;
}

export interface DeckSaver {
  /** Save now if anything is unsaved; waits for a save already running first. */
  save: () => Promise<void>;
  /** The deck on screen is the one stored (after a load or a restore). */
  markSaved: (revision: number) => void;
  hasUnsaved: () => boolean;
}

export function createDeckSaver<D>(deps: DeckSaverDeps<D>): DeckSaver {
  let saved = 0;
  let running: Promise<void> | null = null;
  const once = async () => {
    const { revision, deck } = deps.current();
    if (revision === saved) return;
    deps.onState?.("saving");
    const ok = await deps.write(deck);
    if (!ok) {
      deps.onState?.("error");
      return;
    }
    saved = revision;
    deps.onState?.(deps.current().revision === revision ? "saved" : "dirty");
  };
  return {
    async save() {
      while (running) await running;
      const run = once();
      running = run;
      try {
        await run;
      } finally {
        if (running === run) running = null;
      }
    },
    markSaved(revision) {
      saved = revision;
    },
    hasUnsaved: () => running !== null || deps.current().revision !== saved,
  };
}

/** Flush on pagehide / hidden tab, and ask before unloading while anything is unsaved. */
export function listenToDeckPage(saver: Pick<DeckSaver, "save" | "hasUnsaved">, target: { win: Window; doc: Document } = { win: window, doc: document }): () => void {
  const flush = () => {
    if (saver.hasUnsaved()) void saver.save();
  };
  const onVisibility = () => {
    if (target.doc.visibilityState === "hidden") flush();
  };
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!saver.hasUnsaved()) return;
    flush();
    event.preventDefault();
  };
  target.win.addEventListener("pagehide", flush);
  target.doc.addEventListener("visibilitychange", onVisibility);
  target.win.addEventListener("beforeunload", onBeforeUnload);
  return () => {
    target.win.removeEventListener("pagehide", flush);
    target.doc.removeEventListener("visibilitychange", onVisibility);
    target.win.removeEventListener("beforeunload", onBeforeUnload);
  };
}
