/**
 * Known web domains — the ONE registry of what kind of site a host is (pure; no I/O).
 *
 * Truth: `web.domain_category` (host + optional path pattern → category, with provenance), read through
 * `web.domain_categories_snapshot()` by `./service.ts`. The same registry serves aidream
 * (`aidream/services/web_domains`). Hand-kept host lists are a defect: add a host to the table, or let the
 * learning loop add it (`web.record_domain_observation`).
 *
 * Doc: common-docs/systems/platform/known-web-domains/FEATURE.md
 */

/** One active rule: whole host (`pathPattern` empty) or a regex on the address (`host/path`). */
export interface KnownDomainRule {
  host: string;
  pathPattern: string;
  category: string;
  provenance: "seeded" | "learned" | "pattern" | "admin_approved";
  confidence: number;
}

/** `https://www.Yelp.com/biz/x?y` → `yelp.com/biz/x`. Mirrors SQL `web.domain_address` and aidream `address()`. */
export function domainAddress(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/^(www|m|mobile)\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/** The host of a url (no scheme, www/m, port, path). Mirrors SQL `web.domain_host`. */
export function domainHost(url: string): string {
  return (domainAddress(url).split("/")[0] ?? "").split(":")[0] ?? "";
}

function hostIs(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

const compiled = new Map<string, RegExp | null>();
function regexOf(pattern: string): RegExp | null {
  if (!compiled.has(pattern)) {
    try {
      compiled.set(pattern, new RegExp(pattern));
    } catch {
      // A malformed rule in the data never breaks a screen; it just never matches.
      compiled.set(pattern, null);
    }
  }
  return compiled.get(pattern) ?? null;
}

function ruleMatches(rule: KnownDomainRule, address: string, host: string): boolean {
  if (!rule.pathPattern) return hostIs(host, rule.host);
  const re = regexOf(rule.pathPattern);
  return re ? re.test(address) : false;
}

/** Every category a rule assigns to `url`. */
export function categoriesFor(url: string, rules: readonly KnownDomainRule[]): string[] {
  const address = domainAddress(url);
  const host = domainHost(url);
  return [...new Set(rules.filter((r) => ruleMatches(r, address, host)).map((r) => r.category))];
}

/** The first rule of `categories` that claims `url` — path rules before whole-host rules. */
export function ruleFor(url: string, categories: readonly string[], rules: readonly KnownDomainRule[]): KnownDomainRule | null {
  const address = domainAddress(url);
  const host = domainHost(url);
  const wanted = new Set(categories);
  const candidates = rules.filter((r) => wanted.has(r.category));
  return (
    candidates.find((r) => r.pathPattern && ruleMatches(r, address, host)) ??
    candidates.find((r) => !r.pathPattern && ruleMatches(r, address, host)) ??
    null
  );
}

/** What a person reads as the rule that fired: the host, or the host and its path. */
export function ruleLabel(rule: KnownDomainRule): string {
  if (!rule.pathPattern) return rule.host;
  const cleaned = rule.pathPattern
    .replace(/\[[^\]]*\][+*]?|\([^)]*\)|\.\*|[\\^$]/g, "")
    .replace(/\/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return cleaned || rule.host;
}

/** Anything that carries suggestion rules plus the known-domain categories they read. */
export interface CategoryMatched {
  match: { hosts: string[]; paths: string[]; categories: string[] };
}

/** Each item's known-domain categories expanded into concrete host and path rules, beside its own (pure). */
export function withKnownDomainRules<T extends CategoryMatched>(items: T[], rules: readonly KnownDomainRule[]): T[] {
  return items.map((item) => {
    if (!item.match.categories.length) return item;
    const wanted = new Set(item.match.categories);
    const mine = rules.filter((r) => wanted.has(r.category));
    return {
      ...item,
      match: {
        ...item.match,
        hosts: [...new Set([...item.match.hosts, ...mine.filter((r) => !r.pathPattern).map((r) => r.host)])],
        paths: [...new Set([...item.match.paths, ...mine.filter((r) => r.pathPattern).map((r) => r.pathPattern)])],
      },
    };
  });
}
