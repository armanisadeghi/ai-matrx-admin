import {
  Braces,
  FileImage,
  Layers,
  Library,
  Pencil,
  Sparkles,
  UserCircle,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for every Image Studio sub-route.
 *
 * Consumed by:
 *   - ImageStudioHeader (active-route detection, nav rendering, page title)
 *   - Future ImageStudioSidebar
 *   - Anywhere else that needs to enumerate or look up an Image Studio route
 *
 * The order here is the order links appear in the header nav.
 */

export interface ImageStudioRoute {
  /** Absolute pathname, used for `usePathname()` matching and `<Link href>`. */
  path: string;
  /** Short label rendered in the nav and the page title. */
  label: string;
  /** Slightly longer label for the page-title slot. Falls back to `label`. */
  titleLabel?: string;
  /** Lucide icon — same icon used for nav, title, and (future) sidebar. */
  Icon: LucideIcon;
  /**
   * Whether this route is a full-screen tool that lives inside the
   * `(tools)` route group. Content routes (landing, library, presets)
   * are flagged `false`.
   */
  isTool: boolean;
}

export const IMAGE_STUDIO_ROUTES: readonly ImageStudioRoute[] = [
  {
    path: "/image-studio/generate",
    label: "Generate",
    Icon: Wand2,
    isTool: true,
  },
  {
    path: "/image-studio/edit",
    label: "Edit",
    Icon: Sparkles,
    isTool: true,
  },
  {
    path: "/image-studio/annotate",
    label: "Annotate",
    Icon: Pencil,
    isTool: true,
  },
  {
    path: "/image-studio/avatar",
    label: "Avatar",
    Icon: UserCircle,
    isTool: true,
  },
  {
    path: "/image-studio/convert",
    label: "Convert",
    Icon: FileImage,
    isTool: true,
  },
  {
    path: "/image-studio/from-base64",
    label: "Base64",
    titleLabel: "From Base64",
    Icon: Braces,
    isTool: true,
  },
  {
    path: "/image-studio/presets",
    label: "Presets",
    Icon: Layers,
    isTool: false,
  },
  {
    path: "/image-studio/library",
    label: "Library",
    Icon: Library,
    isTool: false,
  },
] as const;

export const IMAGE_STUDIO_ROOT_PATH = "/image-studio";

/**
 * Find the route that matches a given pathname. Falls back to `null`
 * for the landing page or any path that isn't in the registry.
 */
export function findImageStudioRoute(
  pathname: string,
): ImageStudioRoute | null {
  return IMAGE_STUDIO_ROUTES.find((r) => r.path === pathname) ?? null;
}
