"use client";

/** Video studio hooks beyond the project reads: file URLs for the player, the brand's offerings, the reference video. */

import { useQueries, useQuery } from "@tanstack/react-query";

import { useMediaClient } from "@ai-matrx/media/core";

import { getFile } from "@/features/files/api/files";
import { fetchOfferingItems } from "@/features/marketing/offerings/data";

import { useSocials } from "../components/SocialsContext";
import { knobBool } from "@/lib/knobs/featureKnobs";
import { supabase } from "@/utils/supabase/client";

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
export function useFileUrls(fileIds: readonly string[]): { facts: Record<string, FileFacts>; pending: boolean; failed: string[] } {
  const client = useMediaClient();
  const unique = [...new Set(fileIds.filter(Boolean))];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: ["files", "loadable-url", id],
      queryFn: async (): Promise<FileFacts> => {
        const { data } = await getFile(id);
        const ref = { file_id: id, mime_type: data.mime_type ?? null };
        const resolved = client.resolve(ref);
        // Only a permanent public CDN link is bound as a plain URL. Every other stored file (voice takes, the reference
        // clip, music, private stills) is private: its bytes go through the media door with the person's credentials,
        // never a bare `/files/<id>/download` link an element cannot sign.
        let url: string | null = null;
        if (resolved && resolved.transport !== "blob" && resolved.isCdn) url = String(resolved.src);
        else url = (await client.getBlob(ref)).url;
        return { url, checksum: data.checksum ?? null, mime: data.mime_type ?? null, name: data.file_name ?? null };
      },
      staleTime: 10 * 60_000,
      retry: 1,
    })),
  });
  const facts: Record<string, FileFacts> = {};
  unique.forEach((id, i) => {
    const r = results[i]?.data;
    if (r) facts[id] = r;
  });
  const failed = unique.filter((_, i) => results[i]?.isError);
  return { facts, pending: results.some((r) => r.isPending), failed };
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
export function useReferenceVideo(postId: string | null, settling = false) {
  const { organizationId } = useSocials();
  return useQuery({
    queryKey: ["marketing", "social", "video", "post-media", postId ?? ""],
    queryFn: async ({ signal }) => {
      const media = await listPostVideoMedia(postId as string, { organizationId, signal });
      return media.find((m) => (m.mime_type ?? "").startsWith("video/")) ?? media.find((m) => m.role === "video") ?? null;
    },
    enabled: Boolean(postId && organizationId),
    refetchInterval: (q) => (settling && !q.state.data ? 2500 : false),
  });
}

/** The dev build may render on the API host only when the platform setting `video_variants.local_render_allowed` is on. */
export function useLocalRenderAllowed(): boolean {
  const dev = process.env.NODE_ENV === "development";
  const knob = useQuery({
    queryKey: ["marketing", "social", "video", "local-render-allowed"],
    queryFn: () => knobBool("video_variants", "local_render_allowed"),
    enabled: dev,
    retry: false,
    staleTime: 60_000,
  });
  return dev && knob.data === true;
}

const SCRIPT_REWRITE_MANDATE = "social.clone_script_rewrite";

/**
 * Whether the script-writer job has a performer yet (its mandate's default holder). False while the agent is not built
 * or the answer can't be read: the button then stays the honest coming-soon item.
 */
export function useScriptWriterReady(): boolean {
  const q = useQuery({
    queryKey: ["marketing", "social", "video", "script-writer-ready"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("mandate")
        .from("definition")
        .select("default_holder_id, is_enabled")
        .eq("mandate_key", SCRIPT_REWRITE_MANDATE)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.default_holder_id && data.is_enabled);
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
  return q.data === true;
}
