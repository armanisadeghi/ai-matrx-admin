/**
 * The ONE answer to "which picture does this brand asset show". Stored files (a `file_id`, served from our file CDN as
 * `cdn.matrxserver.com/<user>/<file id>?v=…`) carry no file extension, so an extension test alone dropped every
 * confirmed, saved logo and kept expiring third-party links (critique round 3, N5). Order: our stored file first, then
 * a raw link that names an image file, then a known extension-less image CDN. Pure; tested.
 */

import { secureImageUrl } from "@/features/marketing/lib/website-url";

/** Image CDNs whose links carry no file extension. */
const EXTENSIONLESS_IMAGE_HOSTS = ["images.unsplash.com", "plus.unsplash.com"];

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|svg|ico|avif)(\?|#|$)/i;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** True for a link to a file we store (our file CDN). */
export function isStoredFileUrl(url: string | null | undefined): boolean {
  return hostOf((url ?? "").trim()) === "cdn.matrxserver.com";
}

export interface PreviewableAsset {
  file_id?: string | null;
  source_url: string | null;
}

/** The renderable picture address for an asset, or null when it has none that renders as an image. */
export function brandAssetPreviewUrl(asset: PreviewableAsset): string | null {
  const url = (asset.source_url ?? "").trim();
  if (!url) return null;
  if (asset.file_id || isStoredFileUrl(url)) return secureImageUrl(url);
  if (IMAGE_FILE.test(url)) return secureImageUrl(url);
  if (EXTENSIONLESS_IMAGE_HOSTS.includes(hostOf(url))) return secureImageUrl(url);
  return null;
}
