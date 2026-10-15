"use client";

/**
 * The person's Matrx 2 computers, reached the way the device console reaches one (straight to the
 * relay, the token in the subprotocol): for the /work doors that used to ask Matrx Local over
 * Supabase Broadcast (Full Download first). A computer is tried only when it is online and speaks
 * protocol 1.38+ (`coding.*`); every computer that could not answer says why, in words, so the
 * door's honest "no" names each one.
 */
import { getClaimsUser } from "@ai-matrx/auth";
import { createDesktopClient, type DesktopClient } from "@ai-matrx/desktop-protocol/client";

import { supabase } from "@/utils/supabase/client";
import { getAccessTokenOrNull } from "@/lib/python-client";
import { fetchConsoleDevices } from "@/features/files/devices/console/devices-query";
import { fetchRelayStatus, relayConnectUrl, relaySubprotocols } from "@/features/files/devices/console/relay";
import { clientLabelFor } from "@/features/files/devices/console/sessions/model";
import type { DeviceRow } from "@/features/files/devices/types";
import { CODING_MINOR, cloudSessionFilter, protocolMinor, type CodingDoors, type Matrx2Reach } from "@/features/ai-work/lib/matrx2Coding";

import {
  checkLocalResumable,
  readLocalRuntimeCapability,
  reconcileCodingSession,
  startLocalRuntimeSession,
} from "@/features/ai-work/lib/matrxLocalRuntime";

// One owner for the protocol floor (the door module); read here by Full Download and its tests.
export { CODING_MINOR, protocolMinor };

/** How long one computer gets to answer before the next is tried. */
const READY_MS = 6_000;
/** The most computers one door tries (newest check-in first). */
const MAX_COMPUTERS = 4;

export interface ComputerAnswer<T> {
  device: DeviceRow;
  name: string;
  value: T;
}

export function computerName(device: DeviceRow): string {
  return device.instance_name?.trim() || "Your computer";
}

/**
 * The page's own computer when it names one, filtered BEFORE the cap — so a named computer past
 * the newest four is still the one asked. Pure.
 */
export function onlyDevice<D extends { id: string }>(devices: D[], deviceId?: string | null): D[] {
  return (deviceId ? devices.filter((d) => d.id === deviceId) : devices).slice(0, MAX_COMPUTERS);
}

function webClient(deviceId: string): DesktopClient {
  return createDesktopClient({
    url: relayConnectUrl(deviceId),
    protocols: async () => {
      const fresh = await getAccessTokenOrNull();
      if (!fresh) throw new Error("Not signed in");
      return relaySubprotocols(fresh);
    },
    clientType: "web",
    clientVersion: "web-1",
    ...(typeof navigator === "undefined" ? {} : { clientLabel: clientLabelFor(navigator.userAgent) }),
  });
}

/**
 * Ask each of the person's online Matrx 2 computers in turn until one answers with a value (`work`
 * returns null for "not here"). Returns the first answer, or every computer's reason.
 */
export async function askMatrx2Computers<T>(
  work: (client: DesktopClient, name: string) => Promise<T | null>,
  options: { deviceId?: string | null } = {},
): Promise<ComputerAnswer<T> | { reasons: string[] }> {
  const token = await getAccessTokenOrNull();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  const userId = user?.id ?? null;
  if (!token || !userId) return { reasons: ["Sign in to reach your computers."] };
  const devices = onlyDevice(await fetchConsoleDevices(supabase, userId).catch(() => [] as DeviceRow[]), options.deviceId);
  if (devices.length === 0) return { reasons: ["No computer runs Matrx 2 on this account."] };
  const reasons: string[] = [];
  for (const device of devices) {
    const name = computerName(device);
    // The relay's word first: an offline computer is skipped at once, never waited for.
    const status = await fetchRelayStatus(device.id, token).catch(() => null);
    if (status && !status.online) {
      reasons.push(`${name}: offline or asleep.`);
      continue;
    }
    if (status && protocolMinor(status.protocol_version) > 0 && protocolMinor(status.protocol_version) < CODING_MINOR) {
      reasons.push(`${name}: update Matrx 2 to reach its coding sessions from here.`);
      continue;
    }
    const client = webClient(device.id);
    try {
      client.connect();
      const welcome = await client.ready({ timeoutMs: READY_MS });
      if (protocolMinor(welcome.protocol_version) < CODING_MINOR) {
        reasons.push(`${name}: update Matrx 2 to reach its coding sessions from here.`);
        continue;
      }
      const value = await work(client, name);
      if (value !== null) return { device, name, value };
    } catch (error) {
      reasons.push(`${name}: ${error instanceof Error && /offline|timed out|TIMEOUT|DEVICE_OFFLINE/i.test(`${error.name} ${error.message}`) ? "offline or asleep" : error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.close();
    }
  }
  return { reasons };
}

/**
 * The browser's reach for the coding doors (`matrx2Coding.ts`): the relay's status for every
 * computer (no socket), one socket to the chosen one, and the cloud lookup by chat id.
 */
export const browserMatrx2Reach: Matrx2Reach = {
  async listComputers(deviceId) {
    const token = await getAccessTokenOrNull();
    const {
      data: { user },
    } = await getClaimsUser(supabase);
    if (!token || !user?.id) return { reason: "Sign in to reach your computers." };
    const devices = onlyDevice(await fetchConsoleDevices(supabase, user.id).catch(() => [] as DeviceRow[]), deviceId);
    return Promise.all(
      devices.map(async (device) => {
        const status = await fetchRelayStatus(device.id, token).catch(() => null);
        return { deviceId: device.id, name: computerName(device), online: status ? status.online : null, protocolVersion: status?.protocol_version ?? null };
      }),
    );
  },
  async withClient(computer, work) {
    const client = webClient(computer.deviceId);
    try {
      client.connect();
      const welcome = await client.ready({ timeoutMs: READY_MS });
      if (protocolMinor(welcome.protocol_version) < CODING_MINOR) throw new Error("update Matrx 2 to reach its coding sessions from here.");
      return await work(client as unknown as Parameters<typeof work>[0]);
    } finally {
      client.close();
    }
  },
  async findConversation(providerSessionId) {
    const {
      data: { user },
    } = await getClaimsUser(supabase);
    if (!user?.id) return null;
    const { data, error } = await supabase
      .schema("chat")
      .from("coding_session")
      .select("conversation_id")
      .eq("created_by", user.id)
      .or(cloudSessionFilter(providerSessionId))
      .limit(1);
    if (error) throw new Error(error.message);
    return (data?.[0]?.conversation_id as string | undefined) ?? null;
  },
};

/** The doors as the browser opens them: Matrx 2 first, Matrx Local announced after. */
export const browserCodingDoors: CodingDoors = {
  reach: browserMatrx2Reach,
  local: {
    capability: readLocalRuntimeCapability,
    start: startLocalRuntimeSession,
    resumable: checkLocalResumable,
    reconcile: reconcileCodingSession,
  },
};
