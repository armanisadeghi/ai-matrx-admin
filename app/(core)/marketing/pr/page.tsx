import { permanentRedirect } from "next/navigation";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * Legacy flat pillar. PR now lives on the brand, at /marketing/[brand]/pr.
 * Which brand's work this is can only be answered by a person, so the shim
 * lands on the brands list rather than guessing a brand.
 */
export default function MarketingPressShim() {
  permanentRedirect(marketingRoutes.brands());
}
