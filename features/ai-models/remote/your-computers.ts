/**
 * THE PERSON'S COMPUTERS IN THE WEB CHAT'S PICKER (unified chat item 2 + 3, Arman 2026-10-14/15).
 *
 * Every online Matrx 2 computer this person may reach over the device relay — their own, and (knob
 * desktop.models/org_members_use_local_models, default on) another member's in an organization they
 * share — lists its downloaded local models in the composer's local group. Picking one opens
 * /chat/on-device, where the turn runs ON that computer (models.llm.chat over the relay, the browser
 * talking to the computer directly: our servers carry neither the words nor the answer).
 *
 * While one of the person's OWN computers is online, "Claude (your plan)" is listed too: that turn is
 * a Claude Code run on that computer under the person's own sign-in (Code from anywhere, coding.*),
 * projected into the chat. Never on someone else's computer.
 *
 * Reuse: the relay URL/status/subprotocols are the device console's (features/files/devices/console/
 * relay.ts), the client is @ai-matrx/desktop-protocol's, the port is @ai-matrx/agents' LocalModelsPort.
 */
import type { LocalModelEntry, LocalModelsPort } from "@ai-matrx/agents/models/react";
import { createDesktopClient, type DesktopClient } from "@ai-matrx/desktop-protocol/client";

import { getAccessTokenOrNull } from "@/lib/python-client";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { fetchRelayStatus, relayConnectUrl, relaySubprotocols } from "@/features/files/devices/console/relay";
import { clientLabelFor } from "@/features/files/devices/console/clientLabel";

const LOG = "[your-computers]";
const REFRESH_MS = 30_000;
const READY_MS = 8_000;
/** Computers whose relay status is read per refresh (newest check-in first). */
const MAX_COMPUTERS = 12;
const DESKTOP_PLATFORMS = ["darwin", "win32", "windows", "linux"];

export interface ReachableComputer {
  deviceId: string;
  name: string;
  /** The person's own computer (false: another member's, models only). */
  own: boolean;
}

export interface ComputerModel {
  id: string;
  name: string;
}

/** `device:<deviceId>:<modelId>` and `plan:<deviceId>:claude`: the picker ids this port mints. */
export type YourComputersPick =
  | { kind: "model"; deviceId: string; modelId: string }
  | { kind: "plan"; deviceId: string; provider: "claude" };

export function parsePick(id: string): YourComputersPick | null {
  const [kind, deviceId, rest] = [id.split(":")[0], id.split(":")[1], id.split(":").slice(2).join(":")];
  if (!deviceId || !rest) return null;
  if (kind === "device") return { kind: "model", deviceId, modelId: rest };
  if (kind === "plan" && rest === "claude") return { kind: "plan", deviceId, provider: "claude" };
  return null;
}

export function onDeviceHref(pick: YourComputersPick): string {
  return pick.kind === "model"
    ? `/chat/on-device?d=${encodeURIComponent(pick.deviceId)}&m=${encodeURIComponent(pick.modelId)}`
    : `/chat/on-device?d=${encodeURIComponent(pick.deviceId)}&plan=${pick.provider}`;
}

/** A catalog key as words: "smollm2-135m" → "SmolLM2 135M" is the desktop's job; here a readable fallback. */
export function modelName(id: string, title?: string | null): string {
  if (title) return title;
  return id
    .split(/[-_]/)
    .map((p) => (/^\d/.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** One relay client per computer for this tab (the chat page reuses the picker's). */
const clients = new Map<string, DesktopClient>();

export function computerClient(deviceId: string): DesktopClient {
  let c = clients.get(deviceId);
  if (!c) {
    c = createDesktopClient({
      url: relayConnectUrl(deviceId),
      protocols: async () => {
        const fresh = await getAccessTokenOrNull();
        if (!fresh) throw new Error("Not signed in");
        return relaySubprotocols(fresh);
      },
      getToken: async () => (await getAccessTokenOrNull()) ?? "",
      clientType: "web",
      clientVersion: "web-chat-1",
      ...(typeof navigator === "undefined" ? {} : { clientLabel: clientLabelFor(navigator.userAgent) }),
    });
    c.connect();
    clients.set(deviceId, c);
  }
  return c;
}

/** The computers this person may reach that the relay says are online now. */
export async function onlineComputers(): Promise<ReachableComputer[]> {
  const token = await getAccessTokenOrNull();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  if (!token || !user?.id) return [];
  // Row security answers who may see a computer: the person's own rows and their organizations'.
  const { data, error } = await supabase
    .from("app_instances")
    .select("id, instance_name, user_id, platform, last_seen")
    .in("platform", DESKTOP_PLATFORMS)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(MAX_COMPUTERS);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; instance_name: string | null; user_id: string }>;
  const statuses = await Promise.all(rows.map((r) => fetchRelayStatus(r.id, token).catch(() => null)));
  return rows
    .filter((_, i) => statuses[i]?.online === true)
    .map((r) => ({ deviceId: r.id, name: r.instance_name?.trim() || "Your computer", own: r.user_id === user.id }));
}

/** The downloaded models that can run on that computer (`models.llm.status`). */
export async function computerModels(deviceId: string): Promise<ComputerModel[]> {
  const client = computerClient(deviceId);
  await client.ready({ timeoutMs: READY_MS });
  const status = await client.request("models.llm.status", {}, { timeoutMs: READY_MS });
  return status.models.filter((m) => m.installed && !m.problem).map((m) => ({ id: m.id, name: modelName(m.id, m.title) }));
}

const NONE: readonly LocalModelEntry[] = [];

export interface YourComputersDeps {
  online(): Promise<ReachableComputer[]>;
  models(deviceId: string): Promise<ComputerModel[]>;
  open(href: string): void;
  log?: (message: string) => void;
  refreshMs?: number;
}

export function createYourComputersModels(deps: YourComputersDeps): LocalModelsPort & { refresh(): Promise<void> } {
  const log = deps.log ?? ((m: string) => console.warn(`${LOG} ${m}`));
  const listeners = new Set<() => void>();
  let snapshot: readonly LocalModelEntry[] = NONE;
  let key = "";
  let timer: ReturnType<typeof setInterval> | null = null;
  const publish = (next: LocalModelEntry[]) => {
    const nextKey = next.map((m) => `${m.id}=${m.name}`).join("|");
    if (nextKey === key) return;
    key = nextKey;
    snapshot = next.length ? next : NONE;
    for (const l of listeners) l();
  };
  const refresh = async () => {
    let computers: ReachableComputer[];
    try {
      computers = await deps.online();
    } catch (error) {
      log(`could not read your computers (${error instanceof Error ? error.message : String(error)}): keeping the last list`);
      return;
    }
    const several = computers.length > 1;
    const entries: LocalModelEntry[] = [];
    for (const c of computers) {
      try {
        for (const m of await deps.models(c.deviceId)) {
          entries.push({ id: `device:${c.deviceId}:${m.id}`, name: several || !c.own ? `${m.name} · ${c.name}` : m.name, maker: null });
        }
      } catch (error) {
        log(`${c.name} did not list its models (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    const mine = computers.find((c) => c.own);
    if (mine) entries.push({ id: `plan:${mine.deviceId}:claude`, name: several ? `Claude (your plan) · ${mine.name}` : "Claude (your plan)", maker: "Anthropic" });
    publish(entries);
  };
  return {
    groupLabel: "Your computers",
    getModels: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        void refresh();
        timer = setInterval(() => void refresh(), deps.refreshMs ?? REFRESH_MS);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    open(id) {
      const pick = parsePick(id);
      if (pick) deps.open(onDeviceHref(pick));
    },
    refresh,
  };
}

/**
 * Two ports as one group: THIS computer's (`local:` ids, opened in Matrx 2's own Confidential Chat)
 * first, then the relay's. Each keeps its own `open`.
 */
export function combineLocalModels(here: LocalModelsPort, away: LocalModelsPort, groupLabel = "Your computers"): LocalModelsPort {
  let a: readonly LocalModelEntry[] | null = null;
  let b: readonly LocalModelEntry[] | null = null;
  let both: readonly LocalModelEntry[] = NONE;
  const read = (): readonly LocalModelEntry[] => {
    const nextA = here.getModels();
    const nextB = away.getModels();
    if (nextA !== a || nextB !== b) {
      a = nextA;
      b = nextB;
      both = nextA.length || nextB.length ? [...nextA, ...nextB] : NONE;
    }
    return both;
  };
  return {
    groupLabel,
    getModels: read,
    subscribe(listener) {
      const offA = here.subscribe(listener);
      const offB = away.subscribe(listener);
      return () => {
        offA();
        offB();
      };
    },
    open(id) {
      (id.startsWith("local:") ? here : away).open?.(id);
    },
  };
}

let shared: LocalModelsPort | null = null;

/** The one port for this browser tab (the chat host is rebuilt per render; the store is not). */
export function yourComputersLocalModels(here: LocalModelsPort): LocalModelsPort {
  shared ??= combineLocalModels(
    here,
    createYourComputersModels({
      online: onlineComputers,
      models: computerModels,
      open: (href) => window.location.assign(href),
    }),
  );
  return shared;
}
