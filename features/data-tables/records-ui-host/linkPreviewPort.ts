// features/data-tables/records-ui-host/linkPreviewPort.ts — AT-SHARE: the host's answer to records-ui's `linkPreview` port
// (a URL cell's hover card). The page's metadata is read by OUR SERVER (`GET /web/link-preview`, aidream
// services/link_preview); the browser never fetches the address itself. A page the server could not preview is null.

import { getJson } from "@/lib/python-client";
import { normalizePreviewUrl, type LinkPreview } from "@/lib/link-preview/useLinkPreview";

export interface LinkPreviewCardData {
  title: string | null;
  description: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  imageUrl: string | null;
}

/** The server's preview as the hover card's data; nothing to show is null, never an empty card. */
export function cardFromPreview(preview: LinkPreview | null | undefined): LinkPreviewCardData | null {
  if (!preview || !preview.available) return null;
  if (!preview.title && !preview.description && !preview.image_url) return null;
  return {
    title: preview.title,
    description: preview.description,
    siteName: preview.site_name,
    faviconUrl: preview.favicon_url,
    imageUrl: preview.image_url,
  };
}

export async function readLinkPreview(url: string): Promise<LinkPreviewCardData | null> {
  const normalized = normalizePreviewUrl(url);
  if (!normalized) return null;
  const { data } = await getJson<LinkPreview>(`/web/link-preview?url=${encodeURIComponent(normalized)}`);
  return cardFromPreview(data);
}

export const LINK_PREVIEW_PORT = { read: readLinkPreview };
