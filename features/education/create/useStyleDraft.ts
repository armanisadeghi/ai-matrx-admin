"use client";

// features/education/create/useStyleDraft.ts
//
// The Style and details answers of an Education Create page, kept across a
// reload like the Sources are (the Source input keeps its own picks). Put back
// once, said out loud (`<WizardDraftRestored>` in the layout), refusing and
// naming nothing it cannot read.

import { useEffect, useEffectEvent } from "react";
import { useWizardDraft, type UseWizardDraftResult } from "@/lib/wizard-draft/useWizardDraft";

export function useStyleDraft<T extends object>(
  draftId: string,
  restore: (data: Record<string, unknown>) => { values: T; rejectedKeys: string[] },
  apply: (values: T) => void,
): UseWizardDraftResult<T> {
  const draft = useWizardDraft<T>(draftId, { restore });
  const applyOnce = useEffectEvent(() => draft.applyOnce(apply));
  const status = draft.status;
  useEffect(() => {
    if (status === "found") applyOnce();
  }, [status]);
  return draft;
}
