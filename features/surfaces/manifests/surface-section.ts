/**
 * The app section a surface's page sits in ("/marketing/brands/[brandId]" →
 * "Marketing") — the navigation's own owner for the page's route, the same
 * one the sidebar and header light up, never a second map. Handed to
 * `@ai-matrx/chat` through the manifest seam (`getSurfaceSection`).
 */
// The INDEX lookup (urlPattern is an index field) — never the full registry,
// which would put every manifest body in the first load.
import { getManifest } from "@ai-matrx/chat/surfaces/runtime/registry";
import { primaryNavItems } from "@/features/shell/constants/nav-data";
import { findActiveNavChild, findOwningNavItem } from "@/features/shell/utils/is-nav-group-active";

export function getSurfaceSection(surfaceName: string): string | null {
  const pattern = getManifest(surfaceName)?.urlPattern;
  if (!pattern?.startsWith("/")) return null;
  return findOwningNavItem(pattern, primaryNavItems)?.label ?? null;
}

/**
 * The REAL name of the page at `pathname`: the navigation's own label for the
 * row that owns the route ("/marketing/brands/all" → "Brands"), the same row
 * the sidebar lights up. A surface can serve several routes (the Marketing
 * hub answers its list pages), so its manifest label names the surface; this
 * names the page. A route the navigation does not list answers null (the
 * caller keeps the surface's label, never a guess).
 */
export function getRoutePageName(pathname: string): string | null {
  const owner = findOwningNavItem(pathname, primaryNavItems);
  return (owner && findActiveNavChild(pathname, owner)?.label) ?? null;
}
