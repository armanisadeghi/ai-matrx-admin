"use client";

/**
 * Edits the person APPLIED to the agent but has not saved (an assistant's proposal they pressed Apply
 * on, or a field they changed in Controls) survive a reload. They live on the assistant's own
 * conversation row (`chat.conversation.metadata.agent_studio_unsaved`) beside the Studio's other
 * records (`make-draft.ts`, `improve-record.ts`) — one place per fact, nothing kept only in page
 * memory. Reload re-applies them to the Builder record as unsaved edits (the "Unsaved changes · Save
 * version" bar comes back); Save or Discard clears them. Stored against the version they were made
 * on: once the agent was saved elsewhere, an old draft is dropped rather than laid over newer work.
 *
 * Final review 2026-10-18: "Applied-but-unsaved edits are also silently dropped on reload."
 */

import { useEffect, useRef } from "react";
import { mergeJsonColumn } from "@ai-matrx/data/db";
import type { AgentDefinition, AgentDefinitionRecord } from "@ai-matrx/chat/agents/types/agent-definition.types";
import { createClient } from "@/utils/supabase/client";
import { setAgentField } from "@/features/agents/redux/agent-builder.slice";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";

export const UNSAVED_KEY = "agent_studio_unsaved";

export interface StudioUnsavedEdits {
  agent_id: string;
  /** The agent's saved state the edits were made on (`version`, else `updatedAt`). */
  base: string;
  fields: Partial<Record<keyof AgentDefinition, unknown>>;
}

/** What identifies the saved state an edit was made on. */
export function savedBaseOf(record: Pick<AgentDefinition, "version" | "updatedAt">): string {
  return record.version !== null && record.version !== undefined ? `v${record.version}` : `u${record.updatedAt}`;
}

/** The record's unsaved edits as a storable value; null when it has none. Pure (tested). */
export function unsavedFromRecord(agentId: string, record: AgentDefinitionRecord): StudioUnsavedEdits | null {
  const names = Object.keys(record._dirtyFields ?? {}) as (keyof AgentDefinition)[];
  if (names.length === 0) return null;
  const fields: StudioUnsavedEdits["fields"] = {};
  for (const name of names) fields[name] = record[name];
  // The base is the state BEFORE the edits: a dirty `version` field is never edited by a person.
  return { agent_id: agentId, base: savedBaseOf(record), fields };
}

/** The stored value, or null when it is missing, half-written or for another agent / saved state. */
export function readUnsaved(metadata: unknown, agentId: string, base: string): StudioUnsavedEdits | null {
  const raw = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>)[UNSAVED_KEY] : null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<StudioUnsavedEdits>;
  if (r.agent_id !== agentId || r.base !== base || !r.fields || typeof r.fields !== "object") return null;
  if (Object.keys(r.fields).length === 0) return null;
  return { agent_id: agentId, base, fields: r.fields };
}

async function loadMetadata(conversationId: string): Promise<unknown> {
  const { data, error } = await createClient()
    .schema("chat")
    .from("conversation")
    .select("metadata")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.metadata ?? null;
}

/** Writes (or with `null`, clears) the edits — a guarded merge, so sibling metadata keys survive. */
export async function saveUnsaved(conversationId: string, value: StudioUnsavedEdits | null): Promise<void> {
  const supabase = createClient();
  const result = await mergeJsonColumn<{ id: string; version: number; metadata: unknown }>({
    fetchCurrent: () =>
      supabase.schema("chat").from("conversation").select("id,version,metadata").eq("id", conversationId).maybeSingle(),
    readColumn: (row) => row.metadata,
    merge: (current) => {
      const next = { ...current };
      if (value) next[UNSAVED_KEY] = { ...value, saved_at: new Date().toISOString() };
      else delete next[UNSAVED_KEY];
      return next;
    },
    applyUpdate: ({ value: merged, expectedVersion, nextVersion }) =>
      supabase
        .schema("chat")
        .from("conversation")
        .update({ metadata: merged, version: nextVersion })
        .eq("id", conversationId)
        .eq("version", expectedVersion)
        .select("id,version,metadata")
        .maybeSingle(),
  });
  if (result.status !== "saved") throw new Error(`Unsaved edits were not kept (${result.status})`);
}

const PERSIST_DELAY_MS = 800;

/**
 * Restores the agent's stored unsaved edits once (when the record and the conversation are both
 * there), then keeps the stored copy equal to the record's unsaved edits (debounced; cleared when
 * the record is clean again — saved or discarded).
 */
export function useStudioUnsavedEdits(agentId: string | null | undefined, conversationId: string | null | undefined) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const restoredFor = useRef<string | null>(null);
  const lastWritten = useRef<string | null>(null);
  const key = agentId && conversationId ? `${agentId}:${conversationId}` : null;

  // 1. Restore, once per agent + conversation, after the record has loaded its fields.
  useEffect(() => {
    if (!key || !agentId || !conversationId || restoredFor.current === key) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const attempt = async () => {
      const record = store.getState().agentDefinition?.agents?.[agentId] as AgentDefinitionRecord | undefined;
      if (!record || record._loading || !record._loadedFields?.messages) {
        timer = setTimeout(() => void attempt(), 300);
        return;
      }
      try {
        const stored = readUnsaved(await loadMetadata(conversationId), agentId, savedBaseOf(record));
        if (!live) return;
        if (stored) {
          for (const [field, value] of Object.entries(stored.fields)) {
            dispatch(setAgentField({ id: agentId, field: field as keyof AgentDefinition, value: value as never }));
          }
          lastWritten.current = JSON.stringify(stored);
        }
      } catch (e) {
        toast.error("Your unsaved changes did not load", { description: e instanceof Error ? e.message : String(e) });
      } finally {
        if (live) restoredFor.current = key;
      }
    };
    void attempt();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [key, agentId, conversationId, dispatch, store]);

  // 2. Persist: follow the record's unsaved edits (store subscription, debounced).
  useEffect(() => {
    if (!key || !agentId || !conversationId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      if (restoredFor.current !== key) return; // never overwrite the stored copy before it was read
      const record = store.getState().agentDefinition?.agents?.[agentId] as AgentDefinitionRecord | undefined;
      if (!record || !record._loadedFields?.messages) return;
      const value = unsavedFromRecord(agentId, record);
      const serial = value ? JSON.stringify(value) : null;
      if (serial === lastWritten.current) return;
      const previous = lastWritten.current;
      lastWritten.current = serial;
      void saveUnsaved(conversationId, value).catch((e: unknown) => {
        lastWritten.current = previous;
        toast.error("Your unsaved changes are not kept on reload", { description: e instanceof Error ? e.message : String(e) });
      });
    };
    let lastRecord: unknown = null;
    const unsubscribe = store.subscribe(() => {
      const record = store.getState().agentDefinition?.agents?.[agentId];
      if (record === lastRecord) return;
      lastRecord = record;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, PERSIST_DELAY_MS);
    });
    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        flush();
      }
    };
  }, [key, agentId, conversationId, store]);
}
