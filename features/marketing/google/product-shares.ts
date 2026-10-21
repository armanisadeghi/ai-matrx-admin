// Per-product sharing of ONE Google connection (owner ruling, Arman 2026-10-20):
// connect Google once, share Search Console with a person or an organization, keep
// Gmail/Drive/everything else yours. The server (aidream google_integrations
// product_shares) owns the rules; this file is the client's whole contract with it.
//
// Local types on purpose, like the exchange control in service.ts: the two repos
// deploy independently and these routes are newer than the published API types.

import {
  getGoogleBackend,
  postGoogleBackend,
} from "@/features/marketing/google/service";
import type {
  GoogleConnectionInventory,
  GoogleConnectionResource,
  GoogleConnectionSummary,
} from "@/features/marketing/google/types";

export type ShareGranteeType = "user" | "organization";
export const SHAREABLE_GOOGLE_PRODUCT = "search_console" as const;

export interface GoogleProductShareResult {
  connection_id: string;
  product: string;
  grantee_type: ShareGranteeType | null;
  grantee_id: string | null;
  people: string[];
  resources_granted: number;
  grants_removed: number;
}

export interface GoogleSharedResource {
  resource_id: string;
  connection_id: string;
  resource_type: string;
  resource_ref: string;
  display_name: string | null;
  product: string | null;
  account_email: string | null;
  account_name: string | null;
  status: string | null;
}

export interface GoogleServiceAccountConnectResult {
  connection_id: string;
  account_email: string;
  auth_method: string;
  search_console_properties: string[];
}

/** Who holds the Search Console share, read from the connection's own recorded intent. */
export interface ConnectionShareEntry {
  kind: ShareGranteeType;
  /** user id or organization id */
  id: string;
}

export function sharesOfConnection(
  connection: Pick<GoogleConnectionSummary, "metadata">,
): ConnectionShareEntry[] {
  const out: ConnectionShareEntry[] = [];
  const read = (key: string, idKey: string, kind: ShareGranteeType) => {
    const list = connection.metadata?.[key];
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      if (typeof entry !== "object" || entry === null) continue;
      const row = entry as Record<string, unknown>;
      if (row.product !== SHAREABLE_GOOGLE_PRODUCT) continue;
      const id = row[idKey];
      if (typeof id === "string" && id) out.push({ kind, id });
    }
  };
  read("product_org_shares", "organization_id", "organization");
  read("product_shares", "user_id", "user");
  return out;
}

export async function shareSearchConsole(input: {
  connectionId: string;
  granteeType: ShareGranteeType;
  granteeId: string;
}): Promise<GoogleProductShareResult> {
  const response = await postGoogleBackend(
    "/api/google-integrations/shares",
    {
      connection_id: input.connectionId,
      product: SHAREABLE_GOOGLE_PRODUCT,
      grantee_type: input.granteeType,
      grantee_id: input.granteeId,
    },
    "Search Console could not be shared.",
  );
  return (await response.json()) as GoogleProductShareResult;
}

export async function unshareSearchConsole(input: {
  connectionId: string;
  granteeType: ShareGranteeType;
  granteeId: string;
}): Promise<GoogleProductShareResult> {
  const response = await postGoogleBackend(
    "/api/google-integrations/shares/remove",
    {
      connection_id: input.connectionId,
      product: SHAREABLE_GOOGLE_PRODUCT,
      grantee_type: input.granteeType,
      grantee_id: input.granteeId,
    },
    "Search Console sharing could not be removed.",
  );
  return (await response.json()) as GoogleProductShareResult;
}

export async function listSharedWithMe(
  signal?: AbortSignal,
): Promise<GoogleSharedResource[]> {
  const response = await getGoogleBackend(
    "/api/google-integrations/shares/with-me",
    "Shared Search Console properties could not be loaded.",
    signal,
  );
  const body = (await response.json()) as { resources?: GoogleSharedResource[] };
  return body.resources ?? [];
}

export async function connectGoogleServiceAccount(input: {
  serviceAccountJson: string;
  owner: "user" | "organization";
}): Promise<GoogleServiceAccountConnectResult> {
  const response = await postGoogleBackend(
    "/api/google-integrations/service-account",
    {
      service_account_json: input.serviceAccountJson,
      owner_type: input.owner,
    },
    "The service account could not be connected.",
  );
  return (await response.json()) as GoogleServiceAccountConnectResult;
}

/**
 * The site-binding picker's inventory: the person's own connections PLUS the
 * Search Console properties others shared with her. A shared property rides a
 * stand-in connection row that carries only what the picker needs (the sharer's
 * account label, Search Console scope) — never a credential, and never a
 * connection she could use for anything else.
 */
export function withSharedSearchConsole(
  inventory: GoogleConnectionInventory,
  shared: readonly GoogleSharedResource[],
): GoogleConnectionInventory {
  const ownIds = new Set(inventory.connections.map((c) => c.id));
  const connections = [...inventory.connections];
  const resources: GoogleConnectionResource[] = [...inventory.resources];
  const haveResource = new Set(resources.map((r) => r.id));
  for (const item of shared) {
    if (item.product !== SHAREABLE_GOOGLE_PRODUCT || ownIds.has(item.connection_id)) {
      continue;
    }
    if (!connections.some((c) => c.id === item.connection_id)) {
      connections.push({
        id: item.connection_id,
        owner_type: "user",
        owner_user_id: null,
        organization_id: null,
        provider: "google",
        provider_subject: item.connection_id,
        account_email: item.account_email,
        account_name: item.account_name,
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
        status: "connected",
        last_verified_at: null,
        last_error: null,
        created_at: "",
        updated_at: "",
        metadata: { shared_with_me: true },
        credential_present: true,
        credential_stable: true,
        health: "connected",
        capability_health: null,
      });
    }
    if (!haveResource.has(item.resource_id)) {
      haveResource.add(item.resource_id);
      resources.push({
        id: item.resource_id,
        connection_id: item.connection_id,
        resource_type: "search_console_property",
        resource_ref: item.resource_ref,
        display_name: item.display_name ?? item.resource_ref,
        permission_level: null,
        discovered_at: "",
        metadata: { shared_with_me: true },
      });
    }
  }
  return { connections, resources };
}

export function isSharedWithMeConnection(
  connection: Pick<GoogleConnectionSummary, "metadata">,
): boolean {
  return connection.metadata?.shared_with_me === true;
}
