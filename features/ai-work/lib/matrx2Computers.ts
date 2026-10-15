"use client";

/**
 * The browser's wiring for the /work coding doors (`matrx2Coding.ts`): the person's sign-in, their
 * computers, the relay (the device console's own client, token in the subprotocol), the cloud
 * lookup, the pending-filing store, and the Matrx Local bridge as the announced fallback. The relay
 * reach itself is ONE implementation (`createMatrx2Reach`); this file only injects what a browser
 * has. Full Download, Continue, Reconcile and Start all go through it.
 */
import { getClaimsUser } from "@ai-matrx/auth";
import { createDesktopClient } from "@ai-matrx/desktop-protocol/client";

import { supabase } from "@/utils/supabase/client";
import { getAccessTokenOrNull } from "@/lib/python-client";
import { fetchConsoleDevices } from "@/features/files/devices/console/devices-query";
import { fetchRelayStatus, relayConnectUrl, relaySubprotocols } from "@/features/files/devices/console/relay";
import { clientLabelFor } from "@/features/files/devices/console/sessions/model";
import type { DeviceRow } from "@/features/files/devices/types";
import {
  CODING_MINOR,
  createMatrx2Reach,
  protocolMinor,
  type CodingDoors,
  type PendingFiling,
  type PendingFilingStore,
  type ReachClient,
  type ReachDeps,
} from "@/features/ai-work/lib/matrx2Coding";
import {
  checkLocalResumable,
  readLocalRuntimeCapability,
  reconcileCodingSession,
  startLocalRuntimeSession,
} from "@/features/ai-work/lib/matrxLocalRuntime";

// One owner for the protocol floor (the door module); read here by the device tests.
export { CODING_MINOR, protocolMinor };

export function computerName(device: DeviceRow): string {
  return device.instance_name?.trim() || "Your computer";
}

/** What a browser has, for the one reach. Exported so the reach is tested with these swapped. */
export const browserReachDeps: ReachDeps = {
  async session() {
    const token = await getAccessTokenOrNull();
    const {
      data: { user },
    } = await getClaimsUser(supabase);
    return token && user?.id ? { token, userId: user.id } : null;
  },
  async devices(userId) {
    return (await fetchConsoleDevices(supabase, userId)).map((d) => ({ id: d.id, name: computerName(d) }));
  },
  relayStatus: (deviceId, token) => fetchRelayStatus(deviceId, token),
  client(deviceId) {
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
    }) as unknown as ReachClient;
  },
  async conversation(userId, filter) {
    const { data, error } = await supabase.schema("chat").from("coding_session").select("conversation_id").eq("created_by", userId).or(filter).limit(1);
    if (error) throw new Error(error.message);
    return (data?.[0]?.conversation_id as string | undefined) ?? null;
  },
};

/**
 * Pending filings live in this browser until filed: the start happened here and its homes were
 * chosen here, and a filing is resumed on this browser's next /work load. One key, entries per
 * person (a shared browser never files someone else's start).
 */
const FILINGS_KEY = "ai-work.matrx2-pending-filings";
type StoredFiling = PendingFiling & { userId: string };

function readAll(): StoredFiling[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FILINGS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as StoredFiling[]) : [];
  } catch {
    return [];
  }
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  return user?.id ?? null;
}

export const browserFilingStore: PendingFilingStore = {
  async list() {
    const userId = await currentUserId();
    return readAll().filter((f) => f.userId === userId);
  },
  async put(filing) {
    const userId = await currentUserId();
    if (!userId) return;
    const rest = readAll().filter((f) => f.sessionId !== filing.sessionId);
    localStorage.setItem(FILINGS_KEY, JSON.stringify([...rest, { ...filing, userId }]));
  },
  async remove(sessionId) {
    localStorage.setItem(FILINGS_KEY, JSON.stringify(readAll().filter((f) => f.sessionId !== sessionId)));
  },
};

/** The doors as the browser opens them: Matrx 2 first, Matrx Local announced after. */
export const browserCodingDoors: CodingDoors = {
  reach: createMatrx2Reach(browserReachDeps),
  local: {
    capability: readLocalRuntimeCapability,
    start: startLocalRuntimeSession,
    resumable: checkLocalResumable,
    reconcile: reconcileCodingSession,
  },
  filings: browserFilingStore,
};
