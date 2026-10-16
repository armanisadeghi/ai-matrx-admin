"use client";

/** Video studio query hooks (TanStack Query, keys under the social namespace so `useInvalidateSocial` covers them). */

import { useQuery } from "@tanstack/react-query";

import { useSocials } from "../components/SocialsContext";
import { getVideoProject, listVariants } from "./server";
import { readBrandVideoProjects, readReferencePost, readVideoStructure } from "./service";

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
