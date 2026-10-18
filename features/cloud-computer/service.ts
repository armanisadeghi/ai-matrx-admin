/**
 * Cloud Computer control-plane client: the person's one persistent machine.
 * Server contract: aidream `GET/POST /browser-manager/cloud-computer[/wake]`
 * (`cloud_computer_machine.machine_view`). Never carries an address — the
 * screen itself is the ordinary Cloud Browser stream (`../cloud-browser`).
 */
import { getJson, postJson } from "@/lib/python-client";

export type MachineStatus =
  | "none"
  | "creating"
  | "starting"
  | "running"
  | "shutting_down"
  | "stopped"
  | "failed"
  | "expired";

export interface CloudComputer {
  exists: boolean;
  status: MachineStatus;
  ready: boolean;
  size: "standard" | "large" | null;
  lastActivityAt: string | null;
  humanControl: boolean;
}

/** A wake in motion: the machine is on its way up and polling should go on. */
export function isWaking(machine: CloudComputer): boolean {
  return (
    machine.status === "creating" ||
    machine.status === "starting" ||
    machine.status === "shutting_down"
  );
}

function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function parseCloudComputer(raw: unknown): CloudComputer {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const status = (text(v.status) ?? "none") as MachineStatus;
  const size = v.size === "large" ? "large" : v.size === "standard" ? "standard" : null;
  return {
    exists: v.exists === true,
    status,
    ready: v.ready === true,
    size,
    lastActivityAt: text(v.last_activity_at),
    humanControl: v.human_control === true,
  };
}

/**
 * The last machine read in this browser session, so the browser openers can
 * decide synchronously that a person's browser IS their Computer tab
 * (`useOpenCloudBrowserCanvas`). A cache of a server read, never a source of
 * truth: `null` means "not read yet".
 */
let lastKnown: CloudComputer | null = null;
const lastKnownListeners = new Set<() => void>();
export function lastKnownCloudComputer(): CloudComputer | null {
  return lastKnown;
}
/** Told whenever a new machine read lands (for `useSyncExternalStore`). */
export function subscribeLastKnownCloudComputer(listener: () => void): () => void {
  lastKnownListeners.add(listener);
  return () => {
    lastKnownListeners.delete(listener);
  };
}
function remember(machine: CloudComputer): CloudComputer {
  lastKnown = machine;
  for (const listener of lastKnownListeners) listener();
  return machine;
}

export async function getCloudComputer(): Promise<CloudComputer> {
  const { data } = await getJson<unknown>("/browser-manager/cloud-computer");
  return remember(parseCloudComputer(data));
}

/** `initiation` is required: "user" only when a person's click wakes the machine. */
export async function wakeCloudComputer(initiation: "user" | "auto"): Promise<CloudComputer> {
  const { data } = await postJson<unknown>("/browser-manager/cloud-computer/wake", { initiation });
  return remember(parseCloudComputer(data));
}

/**
 * The Cloud folder on the machine (aidream `GET /browser-manager/cloud-computer/files`):
 * deletes the sync is holding — never sent to the cloud without the person's answer,
 * restored on their own at `restoresAt` — and entries it skipped (symlinks, refused files).
 */
export interface HeldDeletes {
  holdId: string;
  held: number;
  reason: string | null;
  sample: string[];
  since: string | null;
  restoresAt: string | null;
}

export interface CloudFolderState {
  machineOn: boolean;
  hold: HeldDeletes | null;
  skipped: { count: number; items: { path: string; reason: string }[] };
}

export function parseCloudFolderState(raw: unknown): CloudFolderState {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const h = (v.hold && typeof v.hold === "object" ? v.hold : null) as Record<string, unknown> | null;
  const s = (v.skipped && typeof v.skipped === "object" ? v.skipped : {}) as Record<string, unknown>;
  const items = Array.isArray(s.items) ? s.items : [];
  return {
    machineOn: v.machine_on === true,
    hold:
      h && text(h.hold_id)
        ? {
            holdId: text(h.hold_id) as string,
            held: typeof h.held === "number" ? h.held : 0,
            reason: text(h.reason),
            sample: Array.isArray(h.sample) ? h.sample.filter((x): x is string => typeof x === "string") : [],
            since: text(h.since),
            restoresAt: text(h.restores_at),
          }
        : null,
    skipped: {
      count: typeof s.count === "number" ? s.count : 0,
      items: items
        .map((i) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {}))
        .map((i) => ({ path: text(i.path) ?? "", reason: text(i.reason) ?? "" }))
        .filter((i) => i.path),
    },
  };
}

export async function getCloudFolderState(): Promise<CloudFolderState> {
  const { data } = await getJson<unknown>("/browser-manager/cloud-computer/files");
  return parseCloudFolderState(data);
}

/** The person's own answer: the server mints the one token that lets a delete through. */
export async function resolveHeldDeletes(holdId: string, action: "delete" | "restore"): Promise<void> {
  await postJson<unknown>("/browser-manager/cloud-computer/files/resolve", { hold_id: holdId, action });
}
