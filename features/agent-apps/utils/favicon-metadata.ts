import { generateSVGFavicon, svgToDataURI } from "@/utils/favicon-utils";
import type { Metadata } from "next";

const DEFAULT_AGENT_APP_FAVICON = { color: "#6366f1", letter: "AA" };

export type AgentAppIconsVariant = "default" | "demo";

export function getAgentAppIconsMetadata(
  faviconUrl?: string | null,
  _variant: AgentAppIconsVariant = "default",
): Metadata["icons"] {
  if (faviconUrl) {
    return {
      icon: [{ url: faviconUrl, type: "image/svg+xml" }],
    };
  }

  const svg = generateSVGFavicon(DEFAULT_AGENT_APP_FAVICON);
  const dataURI = svgToDataURI(svg);

  return {
    icon: [{ url: dataURI, type: "image/svg+xml" }],
  };
}
