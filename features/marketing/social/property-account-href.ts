import { accountHref } from "./account-href";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * The route of one of a brand's social accounts. A tracked account opens its profile page
 * (`/socials/<platform>/<profileId>`); an account no one has tracked yet has no profile, so
 * it opens its property page at the same address shape (`/socials/<platform>/<propertyId>`),
 * which says "Not tracked" and offers Track. Every account name and avatar links through here.
 */
export function brandAccountHref(
  brandSeg: string,
  row: { platform: string; profileId: string | null | undefined; propertyId?: string | null | undefined },
): string | null {
  const tracked = accountHref(brandSeg, row);
  if (tracked) return tracked;
  return row.propertyId ? marketingRoutes.brandSection(brandSeg, `socials/${row.platform}/${row.propertyId}`) : null;
}
