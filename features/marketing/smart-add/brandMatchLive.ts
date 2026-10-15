/**
 * Smart Add · duplicate-brand check, live reads (the matching rules are brandMatch.ts).
 *
 * Reads under the caller's row security, across every organization the person can see: the active
 * organization is never a filter (access ladder). Four narrow queries run together, then one more for the
 * few brands they point at; no list is ever scanned and compared in the browser.
 */
import { resolveSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import {
  isGenericName,
  matchBrands,
  normalizeHandle,
  parseMatchRules,
  normalizeHost,
  normalizeName,
  probeIsEmpty,
  probeKey,
  type BrandCandidate,
  type BrandMatch,
  type BrandProbe,
  type MatchRules,
} from "./brandMatch";

const FEATURE = "smart_add";
/** An ILIKE pattern with no wildcard meaning for the typed text. */
const literal = (s: string) => s.replace(/[\\%_,()"]/g, " ").trim();

/** The matching rules and the read size, from the feature knobs (smart_add.brand_match.*). A missing knob raises by name. */
async function loadRules(): Promise<{ rules: MatchRules; limit: number }> {
  const read = async (key: string) => {
    const v = await resolveSessionKnob({ feature: FEATURE, key });
    if (v === undefined) throw new Error(`Smart Add setting ${key} could not be read`);
    return v;
  };
  const [genericWords, sharedHosts, nameMinLength, candidateLimit] = await Promise.all([
    read("brand_match.generic_words"),
    read("brand_match.shared_hosts"),
    read("brand_match.name_min_length"),
    read("brand_match.candidate_limit"),
  ]);
  const limit = Number(candidateLimit);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Smart Add setting brand_match.candidate_limit is not a number");
  return { rules: parseMatchRules({ genericWords, sharedHosts, nameMinLength }), limit };
}

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
  const [db, { rules, limit: CANDIDATE_LIMIT }] = await Promise.all([authenticatedWebDb(supabase), loadRules()]);
  const hosts = [...new Set(probe.domains.map(normalizeHost).filter(Boolean))];
  const handles = [...new Set(probe.accounts.map((a) => normalizeHandle(a.handle)).filter((h) => h.length >= 2).map(literal))].filter(Boolean);
  const name = probe.name ? normalizeName(probe.name) : "";
  const nameToken = name && !isGenericName(name, rules) ? name.split(" ").filter((w) => w.length >= 3).sort((a, b) => b.length - a.length)[0] : "";

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
    db.from("brand").select("id, slug, name, organization_id, website_url, created_at").in("id", ids).is("deleted_at", null),
    db.from("site").select("brand_id, domain").in("brand_id", ids).is("deleted_at", null),
    db.from("property").select("brand_id, kind, handle, url").in("brand_id", ids).is("deleted_at", null),
    probe.place ? db.from("business_fact").select("brand_id, value").in("brand_id", ids).eq("kind", "address").is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [brands, siteRows, propRows, facts]) if (r.error) throw new Error(r.error.message);

  const orgIds = [...new Set((brands.data ?? []).map((b) => b.organization_id).filter(Boolean))];
  const orgs = orgIds.length ? await supabase.schema("iam").from("organizations").select("id, name").in("id", orgIds) : { data: [], error: null };
  // A name that could not be read is left out of the row, never a reason to hide the match.
  const orgName = new Map((orgs.error ? [] : (orgs.data ?? [])).map((o) => [o.id, o.name as string]));

  const pool: BrandCandidate[] = (brands.data ?? []).map((b) => {
    const props = (propRows.data ?? []).filter((p) => p.brand_id === b.id);
    return {
      id: b.id,
      slug: b.slug ?? null,
      name: b.name,
      organizationId: b.organization_id,
      organizationName: orgName.get(b.organization_id) ?? null,
      createdAt: b.created_at ?? null,
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
  return matchBrands(probe, pool, rules);
}

/** The account name inside a profile address (instagram.com/ritual → ritual). */
function handleFromUrl(url: string | null): string {
  if (!url) return "";
  const m = url.match(/(?:\/@|\/in\/|\/company\/|\/c\/|\/user\/|\/channel\/|\/r\/|\.com\/|\.net\/)([^/?#]+)/i);
  return m?.[1] ?? "";
}
