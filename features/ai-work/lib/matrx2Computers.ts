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

/** The protocol minor that carries `coding.*`. */
export const CODING_MINOR = 38;
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

/** "1.38" → 38; anything else → 0. Pure. */
export function protocolMinor(version: string | null | undefined): number {
  const minor = Number(String(version ?? "").split(".")[1]);
  return Number.isFinite(minor) ? minor : 0;
}

/**
 * Ask each of the person's online Matrx 2 computers in turn until one answers with a value (`work`
 * returns null for "not here"). Returns the first answer, or every computer's reason.
 */
export async function askMatrx2Computers<T>(
  work: (client: DesktopClient, name: string) => Promise<T | null>,
): Promise<ComputerAnswer<T> | { reasons: string[] }> {
  const token = await getAccessTokenOrNull();
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  const userId = user?.id ?? null;
  if (!token || !userId) return { reasons: ["Sign in to reach your computers."] };
  const devices = (await fetchConsoleDevices(supabase, userId).catch(() => [] as DeviceRow[])).slice(0, MAX_COMPUTERS);
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
    const client = createDesktopClient({
      url: relayConnectUrl(device.id),
      protocols: async () => {
        const fresh = await getAccessTokenOrNull();
        if (!fresh) throw new Error("Not signed in");
        return relaySubprotocols(fresh);
      },
      clientType: "web",
      clientVersion: "web-1",
      ...(typeof navigator === "undefined" ? {} : { clientLabel: clientLabelFor(navigator.userAgent) }),
    });
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
