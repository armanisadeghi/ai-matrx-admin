/**
 * THE HOST-VALUES CHANNEL — a place in the app hands its LIVE values to a
 * mandate run at submit time, as that mandate's offered provision values.
 *
 * WHY (2026-10-18). A mandate's provision declares every value its place holds;
 * most are `mapped_offer` (aidream `pass_by_name=False`): the default Holder
 * never receives them, a binding's consumption map picks what it needs. 36 of
 * 45 call sites send theirs because they LAUNCH the run themselves and put the
 * values on `variables`. The rest never touch the request: an assist chip opens
 * the shared run window and the person sends from its composer; a long-lived
 * conversation (war room, studio) is sent from the package's composer. There
 * the host held the values and had no way to put them on the turn.
 *
 * HOW. A host calls `provideHostValues(mandateKey, provision, read)` (or the
 * `useMandateHostValues` hook). While a provider is registered, every
 * conversation in the store whose `mandateKey` matches gets the package's own
 * pre-send gate (`@ai-matrx/chat/host/conversation-hooks` `beforeSend`), which
 * returns `{ variables: read() }` — the package merges them onto the request
 * that POSTs `/ai/mandates/{key}`, where aidream's ONE consumption pipeline
 * (`mandated_start` → `apply_consumption`) treats `request.variables` as the
 * supplied offered values and records them on the run placement.
 *
 * RULES.
 *  - Mandate door only: a conversation without `mandateKey` (agent door) is
 *    never bridged — a mapped-only value sent to an agent door would reach the
 *    agent by name, which is exactly what `mapped_offer` forbids.
 *  - Turn 1 only by default: once the conversation has an answer, the gate
 *    adds nothing (later turns do not pass the mandate door). A provider with
 *    `everyTurn` instead sends EVERY turn through the mandate door
 *    (`everyTurnThroughMandate`), so a value that changes while the person
 *    talks (the record open on the screen) is current on each turn and the
 *    server re-resolves what it names — context per turn, never a turn-1 copy.
 *  - One direction: the client sends what it holds; nothing comes back.
 *  - A conversation that already has host hooks (the workflow studio) is left
 *    alone — its host owns its gate.
 *  - Empty values (null, undefined, "", []) are dropped: absent, never blank.
 *
 * Guard: `pnpm check:host-values` (every site in HOST_VALUE_SITES calls the
 * channel for its mandate).
 */

import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type {
  ProvisionKey,
  ProvisionOffers,
} from "@ai-matrx/agents/generated/provision-offers";
import {
  getConversationHooks,
  registerConversationHooks,
  type HostTurnExtras,
} from "@ai-matrx/chat/host";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import type { KIND_KEY } from "@ai-matrx/content-ir";

/** The values a host may hand provision `P`: any subset of its offered values. */
export type HostValuesFor<P extends ProvisionKey> = {
  [K in Exclude<keyof ProvisionOffers[P], typeof KIND_KEY>]?: ProvisionOffers[P][K] | null;
};

interface Provider {
  provision: ProvisionKey;
  read: () => Record<string, unknown>;
  once: boolean;
  everyTurn: boolean;
  expiresAt: number | null;
}

export interface ProvideOptions {
  /** Consumed by the first turn that takes it (an assist chip's one launch). */
  once?: boolean;
  /** Forget the values after this long even if never sent. */
  ttlMs?: number;
  /** Send on every turn, through the mandate door (not only turn 1). */
  everyTurn?: boolean;
}

const providers = new Map<string, Provider[]>();
const bridged = new Map<string, () => void>();
let unsubscribeStore: (() => void) | null = null;

/** Drop absent values: null, undefined, blank strings, empty lists. */
export function presentHostValues(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    out[name] = value;
  }
  return out;
}

function liveProvider(mandateKey: string): Provider | null {
  const list = providers.get(mandateKey);
  if (!list) return null;
  const now = Date.now();
  const alive = list.filter((p) => p.expiresAt === null || p.expiresAt > now);
  if (alive.length !== list.length) {
    if (alive.length) providers.set(mandateKey, alive);
    else providers.delete(mandateKey);
  }
  return alive[alive.length - 1] ?? null;
}

interface StoreShape {
  conversations?: { byConversationId?: Record<string, { mandateKey?: string | null } | undefined> };
  messages?: {
    byConversationId?: Record<
      string,
      { orderedIds?: string[]; byId?: Record<string, { role?: string } | undefined> } | undefined
    >;
  };
}

function hasAnswer(state: StoreShape, conversationId: string): boolean {
  const entry = state.messages?.byConversationId?.[conversationId];
  if (!entry?.orderedIds?.length) return false;
  return entry.orderedIds.some((id) => entry.byId?.[id]?.role === "assistant");
}

/** The gate's extras for this conversation's turn — `{}` when nothing applies. */
export function hostValuesForTurn(
  state: StoreShape,
  conversationId: string,
): HostTurnExtras {
  const mandateKey = state.conversations?.byConversationId?.[conversationId]?.mandateKey;
  if (!mandateKey) return {};
  const provider = liveProvider(mandateKey);
  if (!provider || (!provider.everyTurn && hasAnswer(state, conversationId))) return {};
  const variables = presentHostValues(provider.read());
  if (provider.once) releaseProvider(mandateKey, provider);
  return Object.keys(variables).length ? { variables } : {};
}

function bridge(conversationId: string, mandateKey: string): void {
  if (bridged.has(conversationId) || getConversationHooks(conversationId)) return;
  const everyTurn = (providers.get(mandateKey) ?? []).some((p) => p.everyTurn);
  const release = registerConversationHooks(conversationId, {
    beforeSend: async () => {
      const store = getStoreSingleton();
      return store ? hostValuesForTurn(store.getState() as StoreShape, conversationId) : {};
    },
    ...(everyTurn ? { everyTurnThroughMandate: true } : {}),
  });
  bridged.set(conversationId, release);
}

function sweep(): void {
  const store = getStoreSingleton();
  if (!store) return;
  const byId = (store.getState() as StoreShape).conversations?.byConversationId ?? {};
  for (const [conversationId, instance] of Object.entries(byId)) {
    const key = instance?.mandateKey;
    if (key && providers.has(key)) bridge(conversationId, key);
  }
}

function ensureWatching(): void {
  if (unsubscribeStore) return;
  const store = getStoreSingleton();
  if (!store) return;
  unsubscribeStore = store.subscribe(sweep);
}

function stopWatchingIfIdle(): void {
  if (providers.size > 0) return;
  unsubscribeStore?.();
  unsubscribeStore = null;
  for (const release of bridged.values()) release();
  bridged.clear();
}

function releaseProvider(mandateKey: string, provider: Provider): void {
  const list = (providers.get(mandateKey) ?? []).filter((p) => p !== provider);
  if (list.length) providers.set(mandateKey, list);
  else providers.delete(mandateKey);
  stopWatchingIfIdle();
}

/**
 * Hand `mandateKey`'s runs this host's live values for provision `provision`.
 * `read` is called at submit time. Returns the release; the newest provider
 * for a key wins while it is registered.
 */
export function provideHostValues<P extends ProvisionKey>(
  mandateKey: AnyMandateKey,
  provision: P,
  read: () => HostValuesFor<P>,
  options: ProvideOptions = {},
): () => void {
  const provider: Provider = {
    provision,
    read: read as () => Record<string, unknown>,
    once: Boolean(options.once),
    everyTurn: Boolean(options.everyTurn),
    expiresAt: options.ttlMs ? Date.now() + options.ttlMs : null,
  };
  providers.set(mandateKey, [...(providers.get(mandateKey) ?? []), provider]);
  ensureWatching();
  sweep();
  return () => releaseProvider(mandateKey, provider);
}
