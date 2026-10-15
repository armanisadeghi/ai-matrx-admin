/**
 * The person's local models in the web chat composer's picker — only for Matrx 2 on THIS computer.
 *
 * The chat host's `localModels` port (`providers/ChatHostAdapter.tsx`; the chat package hands it to
 * the composer's picker only, never the global ModelCatalogHost). It lists models only when Matrx 2
 * answers on this computer's loopback listener (127.0.0.1:22140-22159, `GET /v1/health` with
 * `service: "matrx-desktop"`; Matrx Local's `/health` is a different app) AND the browser is paired
 * with it. A pick sends `aimatrx://chat/confidential-chat?new=1&model=<id>`, which opens a NEW
 * Confidential Chat conversation on that same computer; nothing of the cloud chat is carried.
 * The relay is never used: it reaches other computers, and the link cannot open them.
 *
 * STAND-IN (announced, logged once): Matrx 2's listener has no pairing door for a browser origin
 * (`/v1/pair` is the extension's; a web tab needs the session token in ~/.matrx/matrx2.json). Until
 * it has one, `pair` returns null and the group is absent with the reason in the console.
 */
import type { LocalModelEntry, LocalModelsPort } from "@ai-matrx/agents/models/react";

export const MATRX2_PORTS = { first: 22140, last: 22159 } as const;
export const MATRX2_HEALTH_PATH = "/v1/health";
const LOG = "[this-machine-local-models]";
const REFRESH_MS = 15_000;

export interface Matrx2Here {
  baseUrl: string;
  deviceId: string | null;
}

/** A paired session's installed text models (`models.llm.status`), ids as the desktop names them. */
export interface Matrx2Session {
  installedTextModels(): Promise<Array<{ id: string; name?: string; maker?: string | null }>>;
}

export interface ThisMachineDeps {
  discover(): Promise<Matrx2Here | null>;
  pair(here: Matrx2Here): Promise<Matrx2Session | null>;
  openLink(url: string): void;
  /**
   * False while there is no pairing door for a browser: the port then never probes the loopback
   * ports (a browser may ask the person for local-network access on each probe) and says why once.
   */
  canPair?: boolean;
  log?: (message: string) => void;
  refreshMs?: number;
}

/** Matrx 2 on this computer, by its own health door (never Matrx Local's `/health`). */
export async function discoverMatrx2(fetchImpl: typeof fetch = fetch): Promise<Matrx2Here | null> {
  for (let port = MATRX2_PORTS.first; port <= MATRX2_PORTS.last; port += 1) {
    const baseUrl = `http://127.0.0.1:${port}`;
    try {
      const res = await fetchImpl(`${baseUrl}${MATRX2_HEALTH_PATH}`, { signal: AbortSignal.timeout(800), cache: "no-store" });
      if (!res.ok) continue;
      const body = (await res.json()) as { service?: string; device_id?: string };
      if (body.service === "matrx-desktop") return { baseUrl, deviceId: body.device_id ?? null };
    } catch {
      // Closed port, or the browser refused the loopback read: the next port.
    }
  }
  return null;
}

/** STAND-IN: no browser pairing door on Matrx 2's listener yet (see the module doc). */
export async function pairWithMatrx2(_here: Matrx2Here): Promise<Matrx2Session | null> {
  return null;
}

export function confidentialChatLink(modelId: string): string {
  const id = modelId.startsWith("local:") ? modelId.slice("local:".length) : modelId;
  return `aimatrx://chat/confidential-chat?new=1&model=${encodeURIComponent(id)}`;
}

const NONE: readonly LocalModelEntry[] = [];

/** `open` is part of `LocalModelsPort` from @ai-matrx/agents with the local pick handoff; named here too. */
export type ThisMachineLocalModelsPort = LocalModelsPort & { open(id: string): void; refresh(): Promise<void> };

export function createThisMachineLocalModels(deps: ThisMachineDeps): ThisMachineLocalModelsPort {
  const log = deps.log ?? ((m: string) => console.warn(`${LOG} ${m}`));
  const listeners = new Set<() => void>();
  let snapshot: readonly LocalModelEntry[] = NONE;
  let key = "";
  let lastReason = "";
  let timer: ReturnType<typeof setInterval> | null = null;

  const say = (reason: string) => {
    if (reason !== lastReason) log(reason);
    lastReason = reason;
  };
  const publish = (next: readonly LocalModelEntry[]) => {
    const nextKey = next.map((m) => m.id).join("|");
    if (nextKey === key) return;
    key = nextKey;
    snapshot = next.length ? next : NONE;
    for (const l of listeners) l();
  };

  const refresh = async () => {
    if (deps.canPair === false) {
      say("This browser cannot pair with Matrx 2 yet (its listener has no browser pairing door): no local models in the picker.");
      return publish(NONE);
    }
    const here = await deps.discover().catch(() => null);
    if (!here) {
      say("Matrx 2 is not running on this computer: no local models in the picker.");
      return publish(NONE);
    }
    const session = await deps.pair(here).catch(() => null);
    if (!session) {
      say("Matrx 2 is on this computer but this browser is not paired with it: no local models in the picker.");
      return publish(NONE);
    }
    try {
      const models = await session.installedTextModels();
      lastReason = "";
      publish(models.map((m) => ({ id: `local:${m.id}`, name: m.name ?? m.id, maker: m.maker ?? null })));
    } catch (error) {
      say(`Matrx 2's model list failed (${error instanceof Error ? error.message : String(error)}): keeping the last list.`);
    }
  };

  return {
    groupLabel: "On this computer",
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
    open(id: string) {
      deps.openLink(confidentialChatLink(id));
    },
    refresh,
  };
}

let shared: ThisMachineLocalModelsPort | null = null;

/** The one port for this browser tab (the chat host is rebuilt per render; the store is not). */
export function thisMachineLocalModels(): LocalModelsPort {
  shared ??= createThisMachineLocalModels({
    discover: () => discoverMatrx2(),
    pair: pairWithMatrx2,
    canPair: false,
    openLink: (url) => window.location.assign(url),
  });
  return shared;
}
