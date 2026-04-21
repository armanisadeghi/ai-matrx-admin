"use client";

/**
 * useIdeContextSync — keeps the agent's instanceContext in sync with the
 * live editor state.
 *
 * On every change to code/language/selection/diagnostics/filePath, we
 * dispatch `setContextEntries` to populate the `vsc_*` keys the agent
 * reads via `ctx_get`. The server team's IdeState.to_variables() convention
 * is mirrored exactly, so any agent that opts into `vsc_*` variables /
 * context slots works unchanged.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setContextEntries } from "@/features/agents/redux/execution-system/instance-context/instance-context.slice";
import type { CodeContextInput } from "../types";
import { buildIdeContextEntries } from "../utils/ideContextVariables";

/**
 * Synchronize IDE context entries (`vsc_*`) onto the given conversation.
 *
 * No-ops while `conversationId` is falsy (e.g. before modal launch resolves).
 */
export function useIdeContextSync(
  conversationId: string | null | undefined,
  input: CodeContextInput,
): void {
  const dispatch = useAppDispatch();

  // Snapshot ref for diff-gating; avoids dispatching when nothing changed.
  // We can't rely on JSON.stringify of the whole input on every render (it's
  // cheap but still allocates). Gate on a compact signature instead.
  const signatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const signature = JSON.stringify({
      code: input.code,
      language: input.language,
      filePath: input.filePath ?? null,
      selection: input.selection ?? null,
      diagnostics: input.diagnostics ?? null,
    });
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;

    const entries = buildIdeContextEntries(input);
    if (entries.length > 0) {
      dispatch(setContextEntries({ conversationId, entries }));
    }
  }, [
    conversationId,
    input.code,
    input.language,
    input.filePath,
    input.selection,
    input.diagnostics,
    dispatch,
  ]);
}
