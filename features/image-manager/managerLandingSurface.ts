// features/image-manager/managerLandingSurface.ts
//
// Builds the `matrx-user/image-manager` scope for the Manager landing
// (`/images/manager`) from the tiles it renders. Synchronous and fetch-free:
// the Surface Context window polls getScope. The landing has no selection, so
// the selection values are omitted (never faked as empty picks).

import { xmlElement, xmlList, xmlText } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  createImageManagerScope,
  type ImageHubLink,
  type ImageHubSection,
} from "@/features/surfaces/manifests/image-manager.manifest";

export const MANAGER_LANDING_ROUTE = "/images/manager";

export function managerLandingSections(links: readonly ImageHubLink[]): ImageHubSection[] {
  return [{ title: "Manager", landing: MANAGER_LANDING_ROUTE, links: [...links] }];
}

export function buildManagerLandingScope(links: readonly ImageHubLink[]): SurfaceScopePayload {
  const sections = managerLandingSections(links);
  return createImageManagerScope({
    image_hub_tab: "manager",
    image_hub_sections: sections,
    image_hub_links: [...links],
    image_hub_link_count: links.length,
    image_hub_overview: xmlElement(
      "images",
      { tab: "manager" },
      xmlList("tools", [...links], (link) =>
        xmlElement("tool", { name: link.label, href: link.href }, xmlText("description", link.description, { max: 120 })),
      ),
    ),
    content: links.map((link) => `${link.label}: ${link.description} (${link.href})`).join("\n"),
  });
}
