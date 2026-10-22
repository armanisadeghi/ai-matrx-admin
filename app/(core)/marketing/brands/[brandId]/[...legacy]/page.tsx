// record-view: none — a catch-all route that resolves paths, not one record
import { notFound, permanentRedirect } from "next/navigation";

import {
  LEGACY_BRAND_SECTIONS,
  mapLegacyBrandRest,
  mapLegacySiteRest,
} from "@/features/marketing/lib/legacy-marketing-urls";
import { marketingBrandPath, marketingSeg } from "@/features/marketing/lib/keys";
import {
  resolveBrandParam,
  resolveSiteParam,
} from "@/features/marketing/lib/keys-server";

type SearchParams = Record<string, string | string[] | undefined>;

function toSearchParams(query: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value))
      value.forEach((entry) => params.append(key, entry));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}

/**
 * THE legacy door for the pre-agency-model brand sections.
 *
 * Since 2026-10-22 the brand workspace itself lives at `/marketing/brands/<brand>/…`
 * (it was `/marketing/<brand>/…`, which next.config.js 308s here). The OLDER
 * brand-first tree used the same prefix with sections that no longer exist —
 * `sites/<siteId>/…`, `assets`, `discovery`, `local` — and stored rows, agent-held
 * URLs and bookmarks still carry them. Every live section is a static route
 * beside this catch-all and wins over it; only an address no live route serves
 * reaches here. A legacy section forwards through the ONE mapping table
 * (`legacy-marketing-urls.ts`); anything else is a real 404, never a redirect
 * (forwarding an unknown section to itself would loop).
 */
export default async function LegacyMarketingBrandSection({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string; legacy: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ brandId, legacy }, query] = await Promise.all([params, searchParams]);
  if (!LEGACY_BRAND_SECTIONS.has(legacy[0] ?? "")) notFound();
  const search = toSearchParams(query);
  const brand = await resolveBrandParam(brandId);
  const brandSeg = brand ? marketingSeg(brand) : brandId;

  const brandTarget = mapLegacyBrandRest(brandSeg, legacy, search);
  if (brandTarget) permanentRedirect(brandTarget);

  // `sites/<siteId>[/section…]` — the old site tree.
  const siteParam = legacy[1];
  if (!siteParam) permanentRedirect(marketingBrandPath(brandSeg, "websites"));
  const site = brand ? await resolveSiteParam(brand.id, siteParam) : null;
  const siteSeg = site ? marketingSeg(site) : siteParam;
  permanentRedirect(
    mapLegacySiteRest(brandSeg, siteSeg, legacy.slice(2), search),
  );
}
