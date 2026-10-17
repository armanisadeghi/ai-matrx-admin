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
export function lastKnownCloudComputer(): CloudComputer | null {
  return lastKnown;
}
function remember(machine: CloudComputer): CloudComputer {
  lastKnown = machine;
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
