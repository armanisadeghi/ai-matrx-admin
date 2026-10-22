// record-view: none — a forward, not a page: the Content home is the topical maps at content/map
import { redirect } from "next/navigation";

import { withForwardedQuery } from "@/features/marketing/lib/forward-query";
import { marketingRoutes } from "@/features/marketing/lib/routes";

/**
 * /marketing/brands/<brand>/content → /marketing/brands/<brand>/content/map, query kept. It rendered the same screen as
 * map/page.tsx; one screen, one address. A 307 (`redirect`), never a 308: browsers cache a permanent redirect
 * forever, and this address already carried one once (to the content plan, until 2026-09-16).
 */
export default async function BrandContentForward({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ brandId }, query] = await Promise.all([params, searchParams]);
  redirect(withForwardedQuery(marketingRoutes.brandTopicalMapHome(brandId), query));
}
