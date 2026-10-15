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
import { mergeJsonColumn, type JsonObject } from "@ai-matrx/data/db";
import type { Json } from "@/types/database.types";

import { supabase } from "@/utils/supabase/client";
import { getAccessTokenOrNull } from "@/lib/python-client";
import { fetchConsoleDevices } from "@/features/files/devices/console/devices-query";
import { fetchRelayStatus, relayConnectUrl, relaySubprotocols } from "@/features/files/devices/console/relay";
import { clientLabelFor } from "@/features/files/devices/console/sessions/model";
import type { DeviceRow } from "@/features/files/devices/types";
import {
  CODING_MINOR,
  createMatrx2Reach,
  filingsFromMetadata,
  metadataWithFiling,
  metadataWithoutFiling,
  protocolMinor,
  type CodingDoors,
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

type FilingClient = Pick<typeof supabase, "from">;

/**
 * Pending filings on the server: each in its computer's own `app_instances` row
 * (`metadata.ai_work.pending_filings`, merged under the row's version so Matrx 2's own metadata
 * keys survive). Row security is the person's own rows; nothing here widens it.
 */
export function createServerFilingStore(client: FilingClient, userId: () => Promise<string | null>): PendingFilingStore {
  const merge = async (deviceId: string, next: (metadata: Record<string, unknown>) => Record<string, unknown>) => {
    const uid = await userId();
    if (!uid) throw new Error("Sign in to file this chat.");
    const result = await mergeJsonColumn<{ id: string; version: number; metadata: unknown }>({
      fetchCurrent: () => client.from("app_instances").select("id, version, metadata").eq("id", deviceId).eq("user_id", uid).maybeSingle(),
      readColumn: (row) => row.metadata,
      merge: (current) => next(current) as JsonObject,
      applyUpdate: ({ value, expectedVersion, nextVersion }) =>
        client
          .from("app_instances")
          .update({ metadata: value as Json, version: nextVersion })
          .eq("id", deviceId)
          .eq("user_id", uid)
          .eq("version", expectedVersion)
          .select("id, version, metadata")
          .maybeSingle(),
    });
    if (result.status === "saved") return;
    const why = result.status === "error" ? (result.error instanceof Error ? result.error.message : String((result.error as { message?: string })?.message ?? result.error)) : result.status === "not_found" ? "that computer's row is not visible to you" : "it kept changing under another writer";
    throw new Error(`The pending filing could not be saved: ${why}.`);
  };
  return {
    async list() {
      const uid = await userId();
      if (!uid) return [];
      const { data, error } = await client.from("app_instances").select("id, metadata").eq("user_id", uid).eq("is_active", true).is("deleted_at", null);
      if (error) throw new Error(`Pending filings could not be read: ${error.message}`);
      return (data ?? []).flatMap((row) => filingsFromMetadata((row as { metadata: unknown }).metadata));
    },
    put: (filing) => merge(filing.deviceId, (metadata) => metadataWithFiling(metadata, filing)),
    remove: (filing) => merge(filing.deviceId, (metadata) => metadataWithoutFiling(metadata, filing.sessionId)),
  };
}

export const browserFilingStore: PendingFilingStore = createServerFilingStore(supabase, async () => {
  const {
    data: { user },
  } = await getClaimsUser(supabase);
  return user?.id ?? null;
});

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
