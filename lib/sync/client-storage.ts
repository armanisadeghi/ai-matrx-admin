/**
 * lib/sync/client-storage.ts
 *
 * THE ONE DOOR to browser storage outside the Redux sync engine.
 *
 * Browser storage holds only what is specific to this browser at this moment:
 * an unsent draft, a panel size, a cache of server data, a device id, a
 * one-shot handoff, a per-tab diagnostic. Every choice about a chat, record,
 * run or setting persists on the server (`lib/redux/preferences` or the record
 * itself) — never here.
 *
 * Every key is declared once with `defineClientKey` / `defineClientKeyFamily`:
 * an id, which storage, what KIND of client-moment state it is, and why it is
 * browser-only. All keys share the `matrx:client:` prefix; a key that used to
 * live under an old name declares it as `legacyKey` and is moved on first read.
 * Every call is SSR-safe and never throws (private mode, quota, disabled
 * storage all degrade to "nothing stored").
 *
 * Raw `localStorage` / `sessionStorage` calls outside `lib/sync/` are refused
 * by `pnpm check:raw-storage` (shrink-only baseline).
 */

import { logger } from "./logger";
import { extractErrorMessage } from "@/utils/errors";

export const CLIENT_KEY_PREFIX = "matrx:client:";

export type ClientStorageArea = "local" | "session";

/** What kind of client-moment state a key holds. There is no "setting" kind. */
export type ClientStateKind =
  | "draft" // unsent input the person has not saved yet
  | "ui-layout" // a size, position, collapsed/expanded state for this screen
  | "cache" // a copy of server data, safe to lose
  | "device" // an identity or fact about this browser/device
  | "handoff" // a one-shot value carried across a redirect or reload
  | "diagnostic" // a debug/trace record for this tab or browser
  | "dev-demo"; // internal demo pages only

export interface ClientKeyDefinition {
  /** Stable id, kebab/dot case, e.g. "entity-list.column-widths". */
  id: string;
  area: ClientStorageArea;
  kind: ClientStateKind;
  /** Why this belongs in the browser and not on the server. */
  reason: string;
}

export interface ClientKeyFamilyDefinition extends ClientKeyDefinition {
  /** Old raw key for a suffix, read once and moved to the prefixed key. */
  legacyKey?: (suffix: string) => string;
}

export interface SingleClientKeyDefinition extends ClientKeyDefinition {
  /** Old raw key name, read once and moved to the prefixed key. */
  legacyKey?: string;
}

const registry = new Map<string, ClientKeyDefinition & { family: boolean }>();

/** Every declared client key (for the admin storage inspector). */
export function listClientKeys(): ReadonlyArray<ClientKeyDefinition & { family: boolean; storageKey: string }> {
  return [...registry.values()].map((def) => ({ ...def, storageKey: CLIENT_KEY_PREFIX + def.id }));
}

function register(def: ClientKeyDefinition, family: boolean): void {
  const existing = registry.get(def.id);
  if (existing && (existing.area !== def.area || existing.family !== family)) {
    // Same id declared twice with different shapes is two features fighting over one key.
    logger.error("client-storage.duplicate-id", { meta: { id: def.id } });
  }
  registry.set(def.id, { ...def, family });
}

function getStore(area: ClientStorageArea): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const store = area === "local" ? window.localStorage : window.sessionStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

function rawGet(area: ClientStorageArea, key: string): string | null {
  const store = getStore(area);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch (err) {
    logger.warn("client-storage.read.failed", { meta: { key, error: extractErrorMessage(err) } });
    return null;
  }
}

function rawSet(area: ClientStorageArea, key: string, value: string): boolean {
  const store = getStore(area);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch (err) {
    // QuotaExceededError or disabled storage — degrade gracefully.
    logger.warn("client-storage.write.failed", { meta: { key, error: extractErrorMessage(err) } });
    return false;
  }
}

function rawRemove(area: ClientStorageArea, key: string): void {
  const store = getStore(area);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch (err) {
    logger.warn("client-storage.remove.failed", { meta: { key, error: extractErrorMessage(err) } });
  }
}

function readWithLegacy(area: ClientStorageArea, key: string, legacy: string | undefined): string | null {
  const current = rawGet(area, key);
  if (current !== null || !legacy || legacy === key) return current;
  const old = rawGet(area, legacy);
  if (old === null) return null;
  if (rawSet(area, key, old)) rawRemove(area, legacy);
  return old;
}

function parseJson<T>(raw: string | null, key: string): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    logger.warn("client-storage.read.malformed", { meta: { key } });
    return null;
  }
}

export interface ClientKey {
  readonly id: string;
  readonly storageKey: string;
  get(): string | null;
  set(value: string): boolean;
  remove(): void;
  getJSON<T>(): T | null;
  setJSON(value: unknown): boolean;
}

export function defineClientKey(def: SingleClientKeyDefinition): ClientKey {
  register(def, false);
  const storageKey = CLIENT_KEY_PREFIX + def.id;
  const get = () => readWithLegacy(def.area, storageKey, def.legacyKey);
  return {
    id: def.id,
    storageKey,
    get,
    set: (value) => rawSet(def.area, storageKey, value),
    remove: () => {
      rawRemove(def.area, storageKey);
      if (def.legacyKey) rawRemove(def.area, def.legacyKey);
    },
    getJSON: <T,>() => parseJson<T>(get(), storageKey),
    setJSON: (value) => rawSet(def.area, storageKey, JSON.stringify(value)),
  };
}

export interface ClientKeyFamily {
  readonly id: string;
  storageKey(suffix: string): string;
  get(suffix: string): string | null;
  set(suffix: string, value: string): boolean;
  remove(suffix: string): void;
  getJSON<T>(suffix: string): T | null;
  setJSON(suffix: string, value: unknown): boolean;
  /** Suffixes currently stored under this family (prefixed keys only). */
  suffixes(): string[];
  /** Remove every entry of this family. */
  clear(): void;
}

/** A key per record/surface: `matrx:client:<id>:<suffix>`. */
export function defineClientKeyFamily(def: ClientKeyFamilyDefinition): ClientKeyFamily {
  register(def, true);
  const base = `${CLIENT_KEY_PREFIX}${def.id}:`;
  const storageKey = (suffix: string) => base + suffix;
  const get = (suffix: string) => readWithLegacy(def.area, storageKey(suffix), def.legacyKey?.(suffix));
  const suffixes = (): string[] => {
    const store = getStore(def.area);
    if (!store) return [];
    const found: string[] = [];
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && k.startsWith(base)) found.push(k.slice(base.length));
      }
    } catch {
      return found;
    }
    return found;
  };
  return {
    id: def.id,
    storageKey,
    get,
    set: (suffix, value) => rawSet(def.area, storageKey(suffix), value),
    remove: (suffix) => {
      rawRemove(def.area, storageKey(suffix));
      const legacy = def.legacyKey?.(suffix);
      if (legacy) rawRemove(def.area, legacy);
    },
    getJSON: <T,>(suffix: string) => parseJson<T>(get(suffix), storageKey(suffix)),
    setJSON: (suffix, value) => rawSet(def.area, storageKey(suffix), JSON.stringify(value)),
    suffixes,
    clear: () => {
      for (const s of suffixes()) rawRemove(def.area, storageKey(s));
    },
  };
}

/**
 * Read/remove a raw key that is being retired (no new writes). For one-shot
 * cleanup of keys whose state moved to the server.
 */
export function readRetiredKey(area: ClientStorageArea, key: string): string | null {
  return rawGet(area, key);
}

export function removeRetiredKey(area: ClientStorageArea, key: string): void {
  rawRemove(area, key);
}

/** Whether the browser storage area is usable at all (SSR → false). */
export function isClientStorageAvailable(area: ClientStorageArea): boolean {
  return getStore(area) !== null;
}
