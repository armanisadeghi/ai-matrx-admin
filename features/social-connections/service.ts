import { createClient } from "@/utils/supabase/client";
import { operationFailed } from "@/utils/errors";
import { socialOauthAttach, socialOauthConfig, socialOauthDisconnect, socialOauthDiscover, socialOauthRefresh, socialOauthSelect, socialOauthSync } from "@ai-matrx/api/integrations";
import { serverApi } from "@/lib/api/server-api";

export async function discoverXAccount(
  connectionId: string,
  organizationId: string,
) {
  return await socialOauthDiscover(serverApi, { body: { connection_id: connectionId } }, { organizationId: organizationId });
}

export async function selectXAccount(
  connectionId: string,
  resourceRef: string,
  organizationId: string,
) {
  return await socialOauthSelect(serverApi, { body: { connection_id: connectionId, resource_ref: resourceRef } }, { organizationId: organizationId });
}

export async function attachXAccount(
  connectionId: string,
  resourceRef: string,
  brandId: string,
  organizationId: string,
) {
  return await socialOauthAttach(serverApi, { body: {
        connection_id: connectionId,
        resource_ref: resourceRef,
        brand_id: brandId,
      } }, { organizationId: organizationId });
}

export async function refreshXAccess(
  connectionId: string,
  organizationId: string,
) {
  return await socialOauthRefresh(serverApi, { body: { connection_id: connectionId } }, { organizationId: organizationId });
}

export async function disconnectXAccount(
  connectionId: string,
  organizationId: string,
) {
  return await socialOauthDisconnect(serverApi, { body: { connection_id: connectionId } }, { organizationId: organizationId });
}

export async function getXConfig(organizationId: string) {
  return await socialOauthConfig(serverApi, {}, { organizationId: organizationId });
}

export async function syncXAccount(
  connectionId: string,
  brandId: string,
  organizationId: string,
) {
  const result = await createClient()
    .schema("social")
    .from("tracked_account")
    .select("id")
    .eq("brand_id", brandId)
    .eq("organization_id", organizationId)
    .contains("metadata", { x_connection_id: connectionId })
    .is("deleted_at", null);
  if (result.error)
    throw operationFailed("find your connected X brand account", result.error);
  if (result.data.length !== 1)
    throw new Error("Select your X account for this brand first.");
  return await socialOauthSync(serverApi, { body: { connection_id: connectionId, tracked_account_id: result.data[0].id } }, { organizationId: organizationId });
}
