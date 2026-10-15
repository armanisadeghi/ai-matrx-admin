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

/**
 * "Schedule it instead" carries the computer's work into the schedule builder: folder, coding app
 * and account (the device itself rides as `runs_on`). Empty when nothing is chosen yet. Pure.
 */
export function computerScheduleParams(plan: Pick<ComputerRunRequest, "folder" | "provider" | "accountProfileId"> | null): string {
  if (!plan) return "";
  const q = new URLSearchParams({ folder: plan.folder, provider: plan.provider });
  if (plan.accountProfileId) q.set("account", plan.accountProfileId);
  return `&${q.toString()}`;
}

/** "last seen Oct 12, 3:04 PM" for a computer, or "" when unknown. Pure (locale formatting aside). */
export function lastSeenLabel(lastSeen: string | null | undefined): string {
  const t = lastSeen ? Date.parse(lastSeen) : NaN;
  return Number.isFinite(t)
    ? `last seen ${new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "";
}

/** What tells same-named computers apart: last seen (with the time) and the machine itself. Pure. */
export function distinguishing(row: { last_seen?: string | null; hostname?: string | null; os_version?: string | null; platform?: string | null }): string {
  const machine = row.hostname?.trim() || [row.platform, row.os_version].filter(Boolean).join(" ");
  return [lastSeenLabel(row.last_seen), machine].filter(Boolean).join(" · ");
}

/**
 * The detail on a computer row: its host name wherever the row holds one, and for an offline (or
 * unknown, removed, too-old) computer its last seen — "never seen" when it never checked in. Pure.
 */
export function computerRowDetail(row: { last_seen?: string | null; hostname?: string | null }, online: boolean): string {
  const host = row.hostname?.trim() || "";
  const seen = online ? "" : lastSeenLabel(row.last_seen) || "never seen";
  return [host, seen].filter(Boolean).join(" · ");
}

export type MachinesRead = "loading" | "ready" | "failed";

/**
 * A row's device detail, never blank: "Loading…" until the device details answer, "Couldn't read"
 * when they failed (or the row is missing from the answer), otherwise `detail()`. Pure.
 */
export function machineDetail(machine: object | undefined, read: MachinesRead, detail: () => string): string {
  if (read === "loading") return "Loading…";
  if (read === "failed" || !machine) return "Couldn't read";
  return detail();
}

/** Names shared by more than one computer: those rows also say when each was last seen. Pure. */
export function duplicateNames(names: string[]): Set<string> {
  const seen = new Map<string, number>();
  for (const n of names) seen.set(n, (seen.get(n) ?? 0) + 1);
  return new Set([...seen].filter(([, c]) => c > 1).map(([n]) => n));
}

/**
 * The label of a chosen computer the list has not shown (yet): "Loading computers…" while the list is
 * still coming, never a wrong "not listed" (re-walk: it flashed for 1–2 s); "Couldn't list your
 * computers" when the list failed; "This computer (not listed)" only once the list truly lacks it. Pure.
 */
export function unlistedLabel(computers: readonly unknown[] | null, problem: string | null): string {
  if (problem) return "Couldn't list your computers";
  if (computers === null) return "Loading computers…";
  return "This computer (not listed)";
}
