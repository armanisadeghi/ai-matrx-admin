import { permanentRedirect } from "next/navigation";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * Legacy flat pillar. Google Ads now lives on the brand, at /marketing/[brand]/ads.
 * Which brand's work this is can only be answered by a person, so the shim
 * lands on the brands list rather than guessing a brand.
 */
export default function MarketingAdsShim() {
  permanentRedirect(marketingRoutes.brands());
}
