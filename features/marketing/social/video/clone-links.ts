/** Where a post's "Clone" / "Clone with 3 variants" lead (the video studio's new-clone page). */

import { marketingRoutes } from "@/features/marketing/lib/routes";

export function cloneHref(brandSeg: string, postId: string, withVariants = false): string {
  return `${marketingRoutes.brandSocials(brandSeg)}/videos/new?post=${encodeURIComponent(postId)}${withVariants ? "&variants=3" : ""}`;
}

/** A post that is (or may be) a video: it has a length, or its format names one. */
export function isClonable(post: { durationSeconds?: number | null; format?: string | null }): boolean {
  if (post.durationSeconds != null && post.durationSeconds > 0) return true;
  return /video|reel|short|clip|tiktok/i.test(post.format ?? "");
}
