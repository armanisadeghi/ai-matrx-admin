"use client";

/** Video studio hooks beyond the project reads: file URLs for the player, the brand's offerings, the reference video. */

import { useQueries, useQuery } from "@tanstack/react-query";

import { useMediaClient } from "@ai-matrx/media/core";

import { getFile } from "@/features/files/api/files";
import { fetchOfferingItems } from "@/features/marketing/offerings/data";

import { useSocials } from "../components/SocialsContext";
import { listPostVideoMedia } from "./server";

export interface FileFacts {
  /** A URL any element or the frame program can load: the durable src, or a blob URL for private bytes. */
  url: string | null;
  checksum: string | null;
  mime: string | null;
  name: string | null;
}

/**
 * A loadable URL (+ the content hash) for each file id, through the ONE media door (`MediaClient.resolve`, and
 * `getBlob` when the bytes need bearer auth an element cannot attach). The raw `/download` link is never bound.
 */
export function useFileUrls(fileIds: readonly string[]): { facts: Record<string, FileFacts>; pending: boolean } {
  const client = useMediaClient();
  const unique = [...new Set(fileIds.filter(Boolean))];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: ["files", "loadable-url", id],
      queryFn: async (): Promise<FileFacts> => {
        const { data } = await getFile(id);
        const ref = { file_id: id, mime_type: data.mime_type ?? null };
        const resolved = client.resolve(ref);
        let url: string | null = null;
        if (resolved && resolved.transport !== "blob") url = String(resolved.src);
        else url = (await client.getBlob(ref)).url;
        return { url, checksum: data.checksum ?? null, mime: data.mime_type ?? null, name: data.file_name ?? null };
      },
      staleTime: 10 * 60_000,
    })),
  });
  const facts: Record<string, FileFacts> = {};
  unique.forEach((id, i) => {
    const r = results[i]?.data;
    if (r) facts[id] = r;
  });
  return { facts, pending: results.some((r) => r.isPending) };
}

/** `sha256:<hex>` — the composition's content-hash form of a file checksum. */
export function contentHashOf(checksum: string | null | undefined): string | null {
  if (!checksum) return null;
  return checksum.startsWith("sha256:") ? checksum : `sha256:${checksum}`;
}

/** The brand's products and services (kept first), for the clone's product pick. */
export function useBrandOfferings() {
  const { brandId } = useSocials();
  return useQuery({
    queryKey: ["marketing", "social", "video", "offerings", brandId],
    queryFn: async () => {
      const items = await fetchOfferingItems(brandId);
      return items
        .filter((i) => i.status !== "dismissed")
        .sort((a, b) => Number(b.status === "confirmed") - Number(a.status === "confirmed"));
    },
  });
}

/** The reference post's stored video file (null when the post has none landed yet). */
export function useReferenceVideo(postId: string | null) {
  const { organizationId } = useSocials();
  return useQuery({
    queryKey: ["marketing", "social", "video", "post-media", postId ?? ""],
    queryFn: async ({ signal }) => {
      const media = await listPostVideoMedia(postId as string, { organizationId, signal });
      return media.find((m) => (m.mime_type ?? "").startsWith("video/")) ?? media.find((m) => m.role === "video") ?? null;
    },
    enabled: Boolean(postId && organizationId),
  });
}
