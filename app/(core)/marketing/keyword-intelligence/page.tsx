import { permanentRedirect } from "next/navigation";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * Legacy flat pillar. Keyword intelligence now lives on one site's SEO practice, at /marketing/[brand]/seo/[site]/keywords.
 * Which brand's work this is can only be answered by a person, so the shim
 * lands on the brands list rather than guessing a brand.
 */
export default function MarketingKeywordIntelligenceShim() {
  permanentRedirect(marketingRoutes.brands());
}
