"use client";

/**
 * useAgentAutoSave
 *
 * Debounced localStorage backup for the active agent.
 * When the agent has dirty state, writes a JSON snapshot to
 * localStorage every `debounceMs` milliseconds.
 *
 * On mount, if a matching key is found (agent id + dirty flag),
 * dispatches mergePartialAgent to recover unsaved changes.
 *
 * This is a safety net only — it does NOT replace the save thunk.
 */

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectActiveAgentId,
  selectAgentById,
} from "@/features/agents/redux/agent-definition/selectors";
import { mergePartialAgent } from "@/features/agents/redux/agent-definition/slice";

const STORAGE_PREFIX = "agent-autosave:";
const DEBOUNCE_MS = 2_000;

export function useAgentAutoSave(agentId?: string) {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector(selectActiveAgentId);
  const id = agentId ?? activeId ?? null;

  const record = useAppSelector((state) =>
    id ? selectAgentById(state, id) : undefined,
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recovery on mount
  useEffect(() => {
    if (!id) return;
    const storageKey = `${STORAGE_PREFIX}${id}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        if (saved && saved._dirty) {
          dispatch(
            mergePartialAgent({
              id,
              ...saved,
              _skipDirty: true,
            } as unknown as Parameters<typeof mergePartialAgent>[0]),
          );
        }
      }
    } catch {
      // Ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debounced backup
  useEffect(() => {
    if (!id || !record?._dirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const storageKey = `${STORAGE_PREFIX}${id}`;
      try {
        const snapshot: Record<string, unknown> = { _dirty: true };
        if (record._dirtyFields) {
          record._dirtyFields.forEach((field) => {
            snapshot[field] = (record as Record<string, unknown>)[field];
          });
        }
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // Quota exceeded or private mode — silently ignore
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, record]);

  // Clear on successful save (clean state)
  useEffect(() => {
    if (!id || record?._dirty !== false) return;
    const storageKey = `${STORAGE_PREFIX}${id}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [id, record?._dirty]);
}
