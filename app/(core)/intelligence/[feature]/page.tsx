import { notFound, redirect } from "next/navigation";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { loginHref } from "@/utils/auth/auth-destination";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import {
  IntelligenceTargetRoute,
  intelligencePageTitle,
  splitQuery,
} from "@/features/mandates/feature-intelligence/IntelligenceTargetRoute";
import {
  featureIntelligenceHref,
  intelligenceHref,
} from "@/features/mandates/feature-intelligence/hrefs";
import {
  readServerTree,
  resolveSlug,
} from "@/features/mandates/feature-intelligence/resolve-destination";
import { isLane } from "@/features/mandates/feature-intelligence/placement-model";

/**
 * /intelligence/[feature] — the AI jobs of one registry node at any depth (its
 * slug: `seo`, `seo-keywords`), or a lane (`everywhere`, `yours`,
 * `your-organization`, `unplaced`, `fixtures`) for jobs no node holds
 * (features/mandates/feature-intelligence). `?mandate=<key>` focuses one job;
 * any other value (`setId`, `brandId`, …) fills place links. A code feature id
 * (`podcast`, `marketing`) opens the node its declared jobs share;
 * `unassigned` (the old no-Domain page) opens Unplaced.
 */

const SLUG_RE = /^[a-z][a-z0-9_-]*$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  let title = "Intelligence";
  if (SLUG_RE.test(feature)) {
    const tree = await readServerTree().catch(() => null);
    if (tree && (isLane(feature) || tree.bySlug.has(feature))) {
      title = intelligencePageTitle(feature, tree);
    }
  }
  return createDynamicRouteMetadata("/mandates", {
    title,
    description: `The AI jobs in ${title.replace(/ intelligence$/, "")}, what runs them, and where.`,
    letter: "IN",
  });
}

export default async function FeatureIntelligenceRoute({
  params,
  searchParams,
}: {
  params: Promise<{ feature: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ feature }, query] = await Promise.all([params, searchParams]);
  if (!SLUG_RE.test(feature)) notFound();

  const verdict = await getSessionVerdict();
  if (!verdict.isAuthenticated) redirect(loginHref(`/intelligence/${feature}`));
  const { focus, context } = splitQuery(query);

  if (feature === "unassigned") redirect(featureIntelligenceHref("unplaced", { context }));

  const tree = await readServerTree();
  const resolved = await resolveSlug(feature, tree, verdict.user.id);
  if (resolved.kind === "page") {
    return <IntelligenceTargetRoute target={feature} tree={tree} query={query} />;
  }
  // An old page id keeps working: a focused job opens on its own page, and the
  // id itself lands on the node its jobs share (or the directory).
  if (resolved.kind === "redirect") {
    if (focus) redirect(intelligenceHref(focus, context));
    redirect(resolved.slug ? featureIntelligenceHref(resolved.slug, { context }) : "/intelligence");
  }
  // An unknown slug is a real 404 — never an empty page that looks like a
  // feature with no jobs.
  notFound();
}
