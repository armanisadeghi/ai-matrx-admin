"use client";

// features/education/create/useCreateRun.ts
//
// THE run half of every Education create page: a run orchestrated in the tab
// (read the Sources, generate, save) is recorded with `useTabBoundRun`, so a
// reload mid-run is never silent. `EducationCreatePage` shows the stopped
// notice; Try again puts the SAME request back (Sources, topic, the page's
// style answers via `onRedo`) and presses Make once the page can start — the
// stopped run's conversations ride along (`continues`) so a save that already
// happened is continued, never made twice. A run stopped while saving offers
// no one-click redo (its save may have landed).
//
// React Compiler is on: no manual memo.

import { useState } from "react";
import type { SourceDraft } from "@ai-matrx/agents/sources/runtime";
import { useTabBoundRun } from "@/lib/wizard-draft/useTabBoundRun";
import type { EducationSources } from "./useEducationSources";

/** What every create run request carries back. */
export interface CreateRunRequestBase {
  drafts: SourceDraft[];
  topic: string;
}

/** What one run's work is handed. */
export interface CreateRunContext {
  /** `await` immediately before sending the save (it is flushed to disk first). */
  saving: () => Promise<void>;
  /** Each conversation of the run, as soon as it exists. */
  attach: (conversationId: string) => void;
  /** The stopped run's conversations this run continues (Try again). */
  continues: readonly string[];
}

export function useCreateRun<R extends CreateRunRequestBase>(
  key: string,
  restore: (request: Record<string, unknown>) => R | null,
  sources: EducationSources,
  opts: {
    /** Put the request's own style answers back on the page. */
    onRedo?: (request: R) => void;
  } = {},
) {
  const tabRun = useTabBoundRun(key, restore);
  const [continues, setContinues] = useState<readonly string[]>([]);
  const [redoPending, setRedoPending] = useState(false);

  /** Run `work` as this page's tab-bound run of `request`. */
  const track = <T,>(request: Record<string, unknown>, work: (ctx: CreateRunContext) => Promise<T>): Promise<T> => {
    const carried = continues;
    setContinues([]);
    return tabRun.track(request, (_settle, saving, attach) => work({ saving, attach, continues: carried }), {
      continues: carried,
    });
  };

  /** Try again: the stopped request back on the page; Make fires once it can. */
  const redo = () => {
    const stopped = tabRun.stopped;
    if (!stopped || stopped.whileSaving) return;
    const req = stopped.request;
    setContinues(stopped.conversationIds);
    tabRun.dismiss();
    for (const s of sources.set.sources) sources.set.remove(s.id);
    for (const draft of req.drafts) sources.set.addReady(draft);
    sources.set.setTopic(req.topic);
    opts.onRedo?.(req);
    setRedoPending(true);
  };

  return {
    stopped: tabRun.stopped,
    runningElsewhere: tabRun.runningElsewhere,
    dismiss: tabRun.dismiss,
    track,
    redo,
    /** Set by `redo`; the page shape presses Make once and clears it. */
    redoPending,
    clearRedo: () => setRedoPending(false),
  };
}

export type CreateRun = ReturnType<typeof useCreateRun<CreateRunRequestBase>>;
