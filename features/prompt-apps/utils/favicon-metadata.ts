import { generateSVGFavicon, svgToDataURI } from "@/utils/favicon-utils";
import type { Metadata } from "next";

// Default Prompt Apps favicon: emerald "PA" (matches navigation-links.tsx)
const DEFAULT_PROMPT_APP_FAVICON = { color: "#10b981", letter: "PA" };

export type PromptAppIconsVariant = "default" | "demo";

/**
 * Generate the icons metadata for a prompt app.
 * Uses the app's custom favicon_url if available, otherwise generates
 * an SVG data URI (emerald "PA", or yellow "D" when variant is "demo").
 */
export function getPromptAppIconsMetadata(
  faviconUrl?: string | null,
  variant: PromptAppIconsVariant = "default",
): Metadata["icons"] {
  if (faviconUrl) {
    return {
      icon: [{ url: faviconUrl, type: "image/svg+xml" }],
    };
  }

  const fallback = DEFAULT_PROMPT_APP_FAVICON;
  const svg = generateSVGFavicon(fallback);
  const dataURI = svgToDataURI(svg);

  return {
    icon: [{ url: dataURI, type: "image/svg+xml" }],
  };
}
