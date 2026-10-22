// lib/ai-models/ownKeyModels.ts
//
// Which models run on the person's OWN provider key (a key in their Vault, or their organization's),
// so the picker and the model chip say "Your key" and the turn costs no model points (owner ruling
// 2026-10-15 #6). The server decides — `GET /ai-models/own-key` reads key NAMES only and the serving
// vendor never reaches the browser.
//
// Loaded on demand: nothing is fetched until a picker or chip first asks `usesOwnKey`. Re-read after
// FRESH_MS so a key just added in the Vault shows up without a reload.

import { getJson } from "@/lib/python-client";

const FRESH_MS = 60_000;

let modelIds: ReadonlySet<string> = new Set();
let loadedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(): void {
  if (inFlight) return;
  inFlight = getJson<{ model_ids: string[] }>("/ai-models/own-key", { captureErrors: false })
    .then(({ data }) => {
      const next = new Set(data.model_ids ?? []);
      const changed = next.size !== modelIds.size || [...next].some((id) => !modelIds.has(id));
      modelIds = next;
      if (changed) listeners.forEach((l) => l());
    })
    .catch((error: unknown) => {
      // Never silent; never blocks the picker — without the list every model simply shows its points.
      console.warn("[own-key models] read failed; models show their usual points", error);
    })
    .finally(() => {
      loadedAt = Date.now();
      inFlight = null;
    });
}

/** Starts a (re)read when the list is stale; the first picker or chip that asks triggers it. */
export function refreshOwnKeyModelsIfStale(): void {
  if (Date.now() - loadedAt > FRESH_MS) load();
}

/** Store subscription for the host: a changed list re-renders the picker. */
export function subscribeOwnKeyModels(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current snapshot (same object until the list changes). */
export function getOwnKeyModelsSnapshot(): ReadonlySet<string> {
  return modelIds;
}
