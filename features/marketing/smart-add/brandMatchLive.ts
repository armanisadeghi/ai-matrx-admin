/**
 * Smart Add · duplicate-brand check, live reads (the matching rules are brandMatch.ts).
 *
 * Reads under the caller's row security, across every organization the person can see: the active
 * organization is never a filter (access ladder). Four narrow queries run together, then one more for the
 * few brands they point at; no list is ever scanned and compared in the browser.
 */
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import {
  isGenericName,
  matchBrands,
  normalizeHandle,
  normalizeHost,
  normalizeName,
  probeIsEmpty,
  probeKey,
  type BrandCandidate,
  type BrandMatch,
  type BrandProbe,
} from "./brandMatch";

const CANDIDATE_LIMIT = 40;
/** An ILIKE pattern with no wildcard meaning for the typed text. */
const literal = (s: string) => s.replace(/[\\%_,()"]/g, " ").trim();

const cache = new Map<string, Promise<BrandMatch[]>>();

/** Existing brands the person can see that match the probe. Equal probes share one answer. */
export function findMatchingBrands(probe: BrandProbe, opts: { ignoreBrandId?: string | null } = {}): Promise<BrandMatch[]> {
  if (probeIsEmpty(probe)) return Promise.resolve([]);
  const key = `${probeKey(probe)}|${opts.ignoreBrandId ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const run = read(probe, opts.ignoreBrandId ?? null);
  cache.set(key, run);
  // A failed read is not remembered: the next ask tries again.
  run.catch(() => cache.delete(key));
  // Brands change; an answer is good for this long.
  setTimeout(() => cache.delete(key), 60_000);
  return run;
}

async function read(probe: BrandProbe, ignoreBrandId: string | null): Promise<BrandMatch[]> {
  const db = await authenticatedWebDb(supabase);
  const hosts = [...new Set(probe.domains.map(normalizeHost).filter(Boolean))];
  const handles = [...new Set(probe.accounts.map((a) => normalizeHandle(a.handle)).filter((h) => h.length >= 2).map(literal))].filter(Boolean);
  const name = probe.name ? normalizeName(probe.name) : "";
  const nameToken = name && !isGenericName(name) ? name.split(" ").filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0] : "";

  const [sites, byHandle, byWebsite, byName] = await Promise.all([
    hosts.length
      ? db.from("site").select("brand_id").in("domain", hosts.flatMap((h) => [h, `www.${h}`])).is("deleted_at", null).not("brand_id", "is", null).limit(CANDIDATE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    handles.length
      ? db
          .from("property")
          .select("brand_id")
          .or(handles.flatMap((h) => [`handle.ilike.${h}`, `handle.ilike.@${h}`, `url.ilike.%/${h}`, `url.ilike.%/${h}/`, `url.ilike.%/@${h}`]).join(","))
          .is("deleted_at", null)
          .not("brand_id", "is", null)
          .limit(CANDIDATE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    hosts.length
      ? db
          .from("property")
          .select("brand_id")
          .eq("kind", "website")
          .or(hosts.map((h) => `url.ilike.%://${literal(h)}%,url.ilike.%://www.${literal(h)}%`).join(","))
          .is("deleted_at", null)
          .not("brand_id", "is", null)
          .limit(CANDIDATE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
    nameToken
      ? db.from("brand").select("id").ilike("name", `%${literal(nameToken)}%`).is("deleted_at", null).limit(CANDIDATE_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [sites, byHandle, byWebsite, byName]) if (r.error) throw new Error(r.error.message);

  const ids = [
    ...new Set([
      ...(sites.data ?? []).map((r) => r.brand_id),
      ...(byHandle.data ?? []).map((r) => r.brand_id),
      ...(byWebsite.data ?? []).map((r) => r.brand_id),
      ...(byName.data ?? []).map((r) => r.id),
    ]),
  ].filter((id): id is string => Boolean(id) && id !== ignoreBrandId);
  if (!ids.length) return [];

  const [brands, siteRows, propRows, facts] = await Promise.all([
    db.from("brand").select("id, slug, name, organization_id, website_url").in("id", ids).is("deleted_at", null),
    db.from("site").select("brand_id, domain").in("brand_id", ids).is("deleted_at", null),
    db.from("property").select("brand_id, kind, handle, url").in("brand_id", ids).is("deleted_at", null),
    probe.place ? db.from("business_fact").select("brand_id, value").in("brand_id", ids).eq("kind", "address").is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [brands, siteRows, propRows, facts]) if (r.error) throw new Error(r.error.message);

  const pool: BrandCandidate[] = (brands.data ?? []).map((b) => {
    const props = (propRows.data ?? []).filter((p) => p.brand_id === b.id);
    return {
      id: b.id,
      slug: b.slug ?? null,
      name: b.name,
      organizationId: b.organization_id,
      domains: [
        b.website_url ?? "",
        ...(siteRows.data ?? []).filter((s) => s.brand_id === b.id).map((s) => s.domain),
        ...props.filter((p) => p.kind === "website").map((p) => p.url ?? ""),
      ].filter(Boolean),
      accounts: props
        .filter((p) => p.kind !== "website" && (p.handle || p.url))
        .map((p) => ({ platform: p.kind, handle: p.handle ?? handleFromUrl(p.url) })),
      places: (facts.data ?? [])
        .filter((f) => f.brand_id === b.id)
        .map((f) => {
          const v = f.value as unknown;
          return v && typeof v === "object" && "text" in v ? String((v as { text: unknown }).text) : typeof v === "string" ? v : "";
        })
        .filter(Boolean),
    };
  });
  return matchBrands(probe, pool);
}

/** The account name inside a profile address (instagram.com/ritual → ritual). */
function handleFromUrl(url: string | null): string {
  if (!url) return "";
  const m = url.match(/(?:\/@|\/in\/|\/company\/|\/c\/|\/user\/|\/channel\/|\/r\/|\.com\/|\.net\/)([^/?#]+)/i);
  return m?.[1] ?? "";
}
