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

export async function getCloudComputer(): Promise<CloudComputer> {
  const { data } = await getJson<unknown>("/browser-manager/cloud-computer");
  return parseCloudComputer(data);
}

export async function wakeCloudComputer(): Promise<CloudComputer> {
  const { data } = await postJson<unknown>("/browser-manager/cloud-computer/wake", {});
  return parseCloudComputer(data);
}
