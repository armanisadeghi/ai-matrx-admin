/**
 * "Runs on" for /work/new: the AI Matrx cloud (the default) or one of the person's Matrx 2
 * computers. A computer's state is the RELAY's word (never `last_seen` arithmetic): online,
 * offline, or unknown when the relay could not be asked — and an online computer too old for
 * `coding.*` (protocol 1.38) says so. Pure parts are exported for the tests; the reads take the
 * same Supabase + relay doors the device console uses.
 */
import type { RelayDeviceStatusEvent } from "@ai-matrx/desktop-protocol";

import { fetchConsoleDevices } from "@/features/files/devices/console/devices-query";
import { fetchRelayStatus } from "@/features/files/devices/console/relay";
import type { DeviceRow } from "@/features/files/devices/types";

import { CODING_MINOR, computerName, protocolMinor } from "./matrx2Computers";

export type RunsOn = "cloud" | { deviceId: string };

export type ComputerState = "online" | "offline" | "unknown" | "update";

export interface ChooserComputer {
  device: DeviceRow;
  name: string;
  state: ComputerState;
  /** Selectable only when online and new enough; the reason is shown otherwise (never empty). */
  selectable: boolean;
  reason: string | null;
}

/** One computer's choice from the relay's last word on it. Pure. */
export function chooserComputer(device: DeviceRow, status: RelayDeviceStatusEvent | null): ChooserComputer {
  const name = computerName(device);
  if (!status) return { device, name, state: "unknown", selectable: false, reason: "Can't reach the relay to check it" };
  if (!status.online) return { device, name, state: "offline", selectable: false, reason: "Offline or asleep" };
  const minor = protocolMinor(status.protocol_version);
  if (minor > 0 && minor < CODING_MINOR) {
    return { device, name, state: "update", selectable: false, reason: "Update Matrx 2 on it to run code" };
  }
  return { device, name, state: "online", selectable: true, reason: null };
}

/** Online first, then the rest in the console's order (newest check-in first). Pure. */
export function orderComputers(list: ChooserComputer[]): ChooserComputer[] {
  return [...list].sort((a, b) => Number(b.selectable) - Number(a.selectable));
}

/** The person's Matrx 2 computers with each one's honest state. Throws when the device read fails. */
export async function listChooserComputers(
  client: Parameters<typeof fetchConsoleDevices>[0],
  userId: string,
  token: string,
): Promise<ChooserComputer[]> {
  const devices = await fetchConsoleDevices(client, userId);
  const answered = await Promise.all(
    devices.map(async (device) => chooserComputer(device, await fetchRelayStatus(device.id, token).catch(() => null))),
  );
  return orderComputers(answered);
}

/** The computer's Sessions view, opened on the session it just started. Pure. */
export function computerSessionLink(deviceId: string, sessionId: string): string {
  return `/devices/${encodeURIComponent(deviceId)}?view=sessions&s=${encodeURIComponent(`#s/${sessionId}`)}`;
}

/** A request id `coding.start` runs once (`^[A-Za-z0-9_-]{8,64}$`). */
export function newClientRequestId(): string {
  return `web-${crypto.randomUUID().replace(/-/g, "")}`;
}
