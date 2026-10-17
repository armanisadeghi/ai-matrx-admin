/**
 * FOLLOWED SERVER WORK — the one door through which background AI work reaches Watch AI and the
 * Builder panel (Arman, 2026-10-17: "I must see EVERY AI integration, foreground and background").
 *
 * A foreground run (a launched agent, a streamed chat turn) is already in the tab's request
 * registry, so Watch AI lists it. Work the SERVER runs detached — an Agent Factory build, an eval
 * run with its judge — has no client stream: nothing in the tab says it exists. Whatever starts or
 * opens such work calls `followServerWork` once; from then on:
 *   - `FollowedWorkSync` (mounted for admin debuggers) reads the work's stored records every few
 *     seconds (`followed-work-resolve.ts`) and keeps `followed-work-store` current;
 *   - Watch AI lists the work's AI calls as their own rail group;
 *   - the Builder panel gets the work's inputs, steps and outputs (surface `ai.server_work`).
 * Registering is a few bytes in sessionStorage — it costs nothing for anyone who never opens either tool.
 */

import { useSyncExternalStore } from "react";

export type FollowedKind = "factory_build" | "test_run" | "user_request" | "conversation";

export interface FollowedWork {
  /** `${kind}:${id}` */
  key: string;
  kind: FollowedKind;
  id: string;
  /** What the rail group says, e.g. "Agent Factory build · Studio". */
  label: string;
  /** The door that registered it (Studio, Factory admin, Evals …). */
  source: string;
  /** Epoch ms of the first registration. */
  at: number;
}

const STORAGE_KEY = "matrx:ai-watch:followed";
const MAX_FOLLOWED = 12;

let items: FollowedWork[] = readStored();
const listeners = new Set<() => void>();

function readStored(): FollowedWork[] {
  try {
    const raw = typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is FollowedWork => Boolean(v) && typeof v === "object" && typeof (v as FollowedWork).key === "string")
      : [];
  } catch {
    return [];
  }
}

function commit(next: FollowedWork[]): void {
  items = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: this tab still follows it in memory.
  }
  for (const fn of listeners) fn();
}

export function followKey(kind: FollowedKind, id: string): string {
  return `${kind}:${id}`;
}

/** Register server work for Watch AI + Builder. Idempotent: the same work is never added twice. */
export function followServerWork(input: { kind: FollowedKind; id: string; label: string; source: string }): void {
  if (!input.id) return;
  const key = followKey(input.kind, input.id);
  if (items.some((w) => w.key === key)) return;
  commit([...items, { key, kind: input.kind, id: input.id, label: input.label, source: input.source, at: Date.now() }].slice(-MAX_FOLLOWED));
}

export function getFollowedWork(): readonly FollowedWork[] {
  return items;
}

export function subscribeFollowedWork(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFollowedWork(): readonly FollowedWork[] {
  return useSyncExternalStore(subscribeFollowedWork, getFollowedWork, () => [] as readonly FollowedWork[]);
}

/** Test helper. */
export function resetFollowedWork(): void {
  commit([]);
}
