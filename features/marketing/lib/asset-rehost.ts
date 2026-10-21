/**
 * Provider CDN pictures (Facebook, Instagram) carry a signed expiry. An asset saved with one and no file_id turns
 * into a placeholder tile within days, so it is filed in our own file service at capture time
 * (aidream POST /brand-guide/assets/{asset_id}/rehost, services/brand_guide/asset_rehost.py), and the tile offers
 * "Image expired · refresh" when the link is already dead.
 */
import { callApi } from "@/lib/api/call-api";
import { getStoreSingleton } from "@/lib/redux/store-singleton";

const EXPIRING_CDN_HOSTS = ["fbcdn.net", "cdninstagram.com", "fbsbx.com"];

/** True for an address on a provider CDN whose image links expire. */
export function isExpiringCdnUrl(url: string | null | undefined): boolean {
  try {
    const host = new URL((url ?? "").trim()).hostname.toLowerCase();
    return EXPIRING_CDN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** The unix time (seconds) the link stops working (its `oe` hex parameter), when it has one. */
export function cdnLinkExpiry(url: string | null | undefined): number | null {
  const m = /[?&]oe=([0-9a-fA-F]{6,16})(?:&|$)/.exec(url ?? "");
  return m ? parseInt(m[1], 16) : null;
}

/** True when the picture can no longer load: flagged by the server, or its signed link is past its expiry. */
export function assetImageExpired(asset: { file_id: string | null; source_url: string | null; metadata?: unknown }): boolean {
  if (asset.file_id) return false;
  const meta = (asset.metadata ?? {}) as { image_expired?: unknown };
  if (meta.image_expired === true) return true;
  const at = cdnLinkExpiry(asset.source_url);
  return isExpiringCdnUrl(asset.source_url) && at !== null && at * 1000 < Date.now();
}

export interface RehostResult {
  status: "already_durable" | "rehosted" | "expired" | "failed";
  file_id?: string | null;
  url?: string | null;
  reason?: string | null;
}

/** Ask the server to file the asset's picture in our file service. Never throws; the answer says what happened. */
export async function rehostBrandAsset(assetId: string, organizationId: string): Promise<RehostResult> {
  const store = getStoreSingleton();
  if (!store) return { status: "failed", reason: "The app is not ready." };
  const result = await store.dispatch(
    callApi({
      // New door 2026-10-21 (aidream api/routers/brand_guide.py); not in the published api-types yet.
      path: "/brand-guide/assets/{asset_id}/rehost" as never,
      method: "POST",
      pathParams: { asset_id: assetId } as never,
      scopeOverrides: { organization_id: organizationId },
    }) as never,
  ) as { error?: { message?: string }; data?: RehostResult };
  if (result.error || !result.data) return { status: "failed", reason: result.error?.message ?? "The picture could not be saved." };
  return result.data;
}
