/**
 * A broken address, explained from what the site itself says about it.
 *
 * "This page returns 404" is useless — worse, it tempts a person to CREATE the
 * page. What they need is who still sends visitors there, whether it ever
 * existed, and the one edit that fixes it. Every word here is derived from
 * `web.page_provenance`; nothing is guessed, and an unknown stays unknown.
 */

import type { PageProvenance } from "@/features/marketing/data/page-provenance";
import type { StoredRemedy } from "@/features/marketing/lib/finding-remedy-render";

/** Item keys whose story is "this address does not answer". */
export const MISSING_PAGE_ITEM_KEYS = new Set(["broken_page_4xx"]);

/** A link on at least this share of crawled pages lives in shared chrome. */
const SITEWIDE_SHARE = 0.5;
const SITEWIDE_MIN_PAGES = 20;

export interface StoryFact {
  label: string;
  value: string;
}

export interface MissingPageStory {
  /** One or two plain sentences: what is actually wrong. */
  headline: string;
  facts: StoryFact[];
  remedy: Extract<StoredRemedy, { kind: "manual" }>;
  /** Best live page to send visitors to instead, when one exists. */
  replacement: PageProvenance["replacements"][number] | null;
}

const n = (value: number) => value.toLocaleString("en-US");
const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function howFound(p: PageProvenance): string | null {
  const d = p.discovery;
  if (d?.source === "link" && d.fromPath) return `a link on ${d.fromPath}`;
  if (d?.source === "sitemap") return "your sitemap";
  if (d?.source === "seed") return "the address list the crawl was given";
  switch (p.knownFrom) {
    case "gsc":
      return "Google Search Console";
    case "ga4":
      return "Google Analytics";
    case "sitemap":
      return "your sitemap";
    case "manual":
      return "a manual import";
    default:
      return null;
  }
}

export function explainMissingPage(
  p: PageProvenance,
  statusCode: number | null,
): MissingPageStory {
  const { sourcePages, crawledPages, anchors, samples } = p.inbound;
  const top = anchors.find((a) => a.text) ?? null;
  const anchor = top?.text ?? null;
  const sitewide =
    sourcePages >= SITEWIDE_MIN_PAGES &&
    crawledPages > 0 &&
    sourcePages / crawledPages >= SITEWIDE_SHARE;
  const replacement = p.replacements[0] ?? null;
  const inSitemap = p.sitemaps.length > 0;
  const gsc = p.searchConsole;
  const worked = shortDate(p.everWorkedAt);
  const found = shortDate(p.discovery?.discoveredAt ?? p.knownSince);
  const via = howFound(p);
  const status = statusCode ?? p.statusNow;
  const statusWord =
    status === 404 || status === 410 ? "doesn't exist" : `answers with error ${status ?? "4xx"}`;
  const linkName = anchor ? `“${anchor}” link` : "link";

  // ── Facts: label/value rows, each a thing we measured.
  const facts: StoryFact[] = [];
  facts.push({
    label: "Linked from",
    value:
      sourcePages === 0
        ? "None of your crawled pages"
        : `${n(sourcePages)} of your ${n(crawledPages)} ${plural(crawledPages, "page", "pages")}` +
          (anchor ? ` · “${anchor}”` : ""),
  });
  if (sourcePages > 0 && !sitewide && samples.length > 0) {
    facts.push({ label: "For example", value: samples.slice(0, 3).join(", ") });
  }
  facts.push({
    label: "Seen working",
    value: worked
      ? `Yes, last on ${worked}`
      : found
        ? `Not by us, since ${found}`
        : "Not by us",
  });
  if (via) facts.push({ label: "How we found it", value: via });
  facts.push({
    label: "In your sitemap",
    value: inSitemap ? `Yes (${p.sitemaps.length})` : "No",
  });
  facts.push({
    label: "Google, last 90 days",
    value: gsc.connected
      ? gsc.impressions90d === 0
        ? "Not shown in any search"
        : `${n(gsc.impressions90d)} impressions, ${n(gsc.clicks90d)} clicks`
      : "Search Console not connected",
  });
  if (p.workingChildren.count > 0) {
    facts.push({
      label: "Pages under it",
      value: `${n(p.workingChildren.count)} working, e.g. ${p.workingChildren.samples[0]}`,
    });
  }

  const hasTraffic = gsc.connected && gsc.impressions90d > 0;
  const steps: string[] = [];
  let title: string;
  let where: string;
  let headline: string;

  if (sourcePages > 0 && !worked) {
    // A link that was always wrong. Fix the LINK; never build a page for it.
    title = `Fix the ${linkName}`;
    where = sitewide
      ? "your site's menu or footer — the part every page shares"
      : `the ${plural(sourcePages, "page", "pages")} that carry the link`;
    headline = sitewide
      ? `Your ${linkName} points to ${p.path}, which ${statusWord}. It is on ${n(sourcePages)} of your ${n(crawledPages)} pages, so it sits in your menu or footer.`
      : `${n(sourcePages)} ${plural(sourcePages, "page links", "pages link")} to ${p.path}, which ${statusWord}.`;
    steps.push(
      replacement
        ? `Point the ${linkName} at the right page, or remove it. Closest live page we found: ${replacement.path}.`
        : `Point the ${linkName} at the right page, or remove it.`,
    );
    if (sitewide) {
      steps.push(`It is one shared link, so one edit fixes all ${n(sourcePages)} pages.`);
    } else if (samples.length > 0) {
      steps.push(`It appears on: ${samples.join(", ")}${sourcePages > samples.length ? ", and more" : ""}.`);
    }
    if (inSitemap) steps.push(`Also remove ${p.path} from your sitemap.`);
    steps.push(`Don't create a page at ${p.path} unless you meant to have one.`);
  } else if (sourcePages > 0) {
    // A page that existed and went away while links still point at it.
    title = `Restore or redirect ${p.path}`;
    where = "your website's pages list, or your host's redirect settings";
    headline = `${p.path} worked until ${worked} and ${n(sourcePages)} of your pages still link to it.`;
    steps.push(`Put the page back at ${p.path}, or`);
    steps.push(
      replacement
        ? `redirect ${p.path} to the page that replaced it (a permanent 301 redirect). Closest live page we found: ${replacement.path}.`
        : "redirect it to the page that replaced it (a permanent 301 redirect).",
    );
    if (inSitemap) steps.push(`If you don't restore it, remove it from your sitemap.`);
    if (sitewide) steps.push(`The ${linkName} is in your menu or footer — update it too.`);
  } else if (hasTraffic || inSitemap) {
    title = hasTraffic ? `Redirect ${p.path}` : `Take ${p.path} out of your sitemap`;
    where = hasTraffic
      ? "your host's redirect settings"
      : "your sitemap settings (usually your SEO plugin)";
    headline = hasTraffic
      ? `Nothing on your site links to ${p.path}, but Google still shows it in searches.`
      : `Your sitemap lists ${p.path}, which ${statusWord}.`;
    if (hasTraffic) {
      steps.push(
        replacement
          ? `Redirect ${p.path} to your closest matching page (a permanent 301 redirect) — perhaps ${replacement.path}.`
          : `Redirect ${p.path} to your closest matching page (a permanent 301 redirect).`,
      );
    }
    if (inSitemap) steps.push(`Remove ${p.path} from your sitemap.`);
  } else {
    title = "Probably nothing to do";
    where = "nowhere — unless you want to keep old bookmarks working";
    headline = gsc.connected
      ? `Nothing on your site links to ${p.path}, it isn't in your sitemap, and Google doesn't show it.`
      : `Nothing on your site links to ${p.path} and it isn't in your sitemap.`;
    steps.push(
      replacement
        ? `Optional: redirect ${p.path} to your closest page for old bookmarks — perhaps ${replacement.path}.`
        : "Optional: redirect it to your closest page for old bookmarks.",
    );
    steps.push("Otherwise mark this as intentional.");
  }

  return {
    headline,
    facts,
    replacement,
    remedy: {
      kind: "manual",
      title,
      where,
      summary: "This clears on the next crawl once the address is fixed.",
      instruction: steps.join("\n"),
    },
  };
}
