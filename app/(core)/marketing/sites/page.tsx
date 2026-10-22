import { permanentRedirect } from "next/navigation";

/**
 * LEGACY: the flat cross-brand site portfolio.
 *
 * The cross-brand plane has no site list of its own any more — a website belongs to
 * a brand, so the list is the door and each brand carries its own Websites
 * section (`/marketing/brands/[brandKey]/websites`).
 */
export default function LegacyMarketingSitesRedirect() {
  permanentRedirect("/marketing/brands");
}
