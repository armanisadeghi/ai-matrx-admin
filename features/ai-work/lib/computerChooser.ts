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
import { fileMatrx2Run, startCodingRun, type CodingDoors, type FilingOutcome } from "./matrx2Coding";

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


/** What Run needs on the chosen computer (the form's answer). */
export interface ComputerRunRequest {
  deviceId: string;
  name: string;
  provider: "claude" | "codex";
  folder: string;
  accountProfileId: string | null;
}

/**
 * Run on the chosen computer through THE coding door (`startCodingRun`, the one start path every
 * /work surface uses), then file the chat under the person's homes once it reaches AI Matrx
 * (`fileMatrx2Run`). Returns where to go (the computer's Sessions view on the new session) and the
 * filing, which the caller follows. A refusal throws with the computer's own words.
 */
export async function runOnChosenComputer(
  doors: CodingDoors,
  request: ComputerRunRequest,
  prompt: string,
): Promise<{ link: string; sessionId: string; filing: Promise<FilingOutcome> }> {
  const computer = { deviceId: request.deviceId, name: request.name };
  const started = await startCodingRun(
    doors,
    { via: "matrx2", computer },
    { cwd: request.folder, prompt, provider: request.provider, accountProfileId: request.accountProfileId },
  );
  if (started.via !== "matrx2") throw new Error(`${request.name} did not start it.`);
  return {
    link: computerSessionLink(request.deviceId, started.sessionId),
    sessionId: started.sessionId,
    filing: fileMatrx2Run(doors, started.computer, started.sessionId),
  };
}
