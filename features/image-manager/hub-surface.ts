import { z } from "zod";
import type { ImageHubSection } from "@/features/surfaces/manifests/image-manager.manifest";

/** A navigation target may open only a door rendered by this landing. */
export function parseImageHubDestination(value: unknown, sections: readonly ImageHubSection[]): string {
  const href = z.string().parse(value);
  if (!sections.some((section) => section.landing === href || section.links.some((link) => link.href === href))) {
    throw new Error("Choose a route from image_hub_sections or image_hub_links. Nothing was changed.");
  }
  return href;
}
