// record-view: none — a forward, not a page: Products & services lives under Identity (Arman, 2026-10-21)
import { redirect } from "next/navigation";

import { withForwardedQuery } from "@/features/marketing/lib/forward-query";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/** /marketing/brands/<brand>/offerings → Identity › Products & services, query string kept (307, never cached). */
export default async function BrandOfferingsForward({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ brandId }, query] = await Promise.all([params, searchParams]);
  redirect(withForwardedQuery(marketingRoutes.brandOfferings(brandId), query));
}
