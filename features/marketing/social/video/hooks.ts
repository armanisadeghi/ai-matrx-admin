"use client";

/** Video studio query hooks (TanStack Query, keys under the social namespace so `useInvalidateSocial` covers them). */

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchOperationsByLink } from "@/lib/runtime-operations/operationsByLink";

import { useSocials } from "../components/SocialsContext";
import { getVideoProject, listVariants } from "./server";
import { readActiveBatch, readAllVideoProjects, readBrandVideoProjects, readReferencePost, readVideoStructure } from "./service";

export const videoKeys = {
  all: ["marketing", "social", "video"] as const,
  list: (brandId: string) => ["marketing", "social", "video", "list", brandId] as const,
  project: (projectId: string) => ["marketing", "social", "video", "project", projectId] as const,
  variants: (projectId: string) => ["marketing", "social", "video", "variants", projectId] as const,
  post: (postId: string) => ["marketing", "social", "video", "post", postId] as const,
};

export function useBrandVideoProjects() {
  const { brandId } = useSocials();
  return useQuery({ queryKey: videoKeys.list(brandId), queryFn: () => readBrandVideoProjects(brandId) });
}

/** Every brand's video projects (the cross-brand Videos page). */
export function useAllVideoProjects() {
  return useQuery({ queryKey: videoKeys.list("all-brands"), queryFn: readAllVideoProjects });
}

export function useVideoProject(projectId: string) {
  const { organizationId } = useSocials();
  return useQuery({
    queryKey: videoKeys.project(projectId),
    queryFn: ({ signal }) => getVideoProject(projectId, { organizationId, signal }),
    enabled: Boolean(organizationId),
  });
}

export function useProjectVariants(projectId: string) {
  const { organizationId } = useSocials();
  return useQuery({
    queryKey: videoKeys.variants(projectId),
    queryFn: ({ signal }) => listVariants(projectId, { organizationId, signal }),
    enabled: Boolean(organizationId),
  });
}

export function useReferencePost(postId: string | null) {
  return useQuery({
    queryKey: videoKeys.post(postId ?? ""),
    queryFn: () => readReferencePost(postId as string),
    enabled: Boolean(postId),
  });
}

export function useVideoStructure(postId: string | null) {
  return useQuery({
    queryKey: [...videoKeys.post(postId ?? ""), "structure"],
    queryFn: () => readVideoStructure(postId as string),
    enabled: Boolean(postId),
  });
}

/** The link kind the server stamps on a video analysis (id = the post): how a reloaded page finds the run still going. */
export const VIDEO_ANALYSIS_LINK_KIND = "video_analysis";

/**
 * Is an analysis of this post running on the server right now (started from this page before a reload, or from another
 * tab)? Reads the runtime's by-link operations; asks again every few seconds while one runs, and when it ends the
 * stored structure is re-read so the finished analysis appears without a manual refresh.
 */
export function useRunningAnalysis(postId: string | null, enabled: boolean): boolean {
  const queryClient = useQueryClient();
  const wasRunning = useRef(false);
  const q = useQuery({
    queryKey: [...videoKeys.post(postId ?? ""), "analysis-running"],
    enabled: Boolean(postId) && enabled,
    queryFn: async () => {
      const data = await fetchOperationsByLink(VIDEO_ANALYSIS_LINK_KIND, postId as string);
      return (data?.operations ?? []).some((o) => !o.is_terminal);
    },
    refetchInterval: (query) => (query.state.data ? 4000 : false),
    retry: false,
  });
  const running = Boolean(q.data);
  useEffect(() => {
    if (wasRunning.current && !running && postId) {
      void queryClient.invalidateQueries({ queryKey: videoKeys.post(postId) });
      void queryClient.invalidateQueries({ queryKey: ["marketing", "social", "video", "post-media", postId] });
    }
    wasRunning.current = running;
  }, [running, postId, queryClient]);
  return running;
}

/**
 * The batch the server holds for these variants (running, finished or stopped). Asks again every 4 s while it is running so
 * a reloaded page, or a second tab, follows it to the end; stops asking once it is over.
 */
export function useActiveBatch(variantIds: readonly string[], enabled: boolean) {
  const key = variantIds.join(",");
  return useQuery({
    queryKey: ["video", "active-batch", key],
    queryFn: () => readActiveBatch(variantIds),
    enabled: enabled && variantIds.length > 0,
    refetchInterval: (q) => (q.state.data?.status === "processing" ? 4000 : false),
  });
}
