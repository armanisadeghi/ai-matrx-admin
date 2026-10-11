// features/mandates/feature-intelligence/IntelligenceTargetRoute.tsx
//
// The server half of every intelligence page (`/intelligence/<node slug>` at
// any depth, and the lanes `/intelligence/everywhere|yours|your-organization|
// unplaced|fixtures`): signs the viewer in, sends a focused job that sits
// elsewhere to its own page, and renders the page body under a one-row header
// whose breadcrumb is the registry path (Marketing › SEO › SEO Keywords).

import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { loginHref } from "@/utils/auth/auth-destination";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { FeatureIntelligence } from "./FeatureIntelligence";
import { intelligenceHref } from "./hrefs";
import { homeOfKey } from "./resolve-destination";
import { isLane, isWithin, LANES, pathOf, type Tree } from "./placement-model";
import { storedMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";

export type RouteQuery = Record<string, string | string[] | undefined>;

/** `?mandate=` focuses one job; `?q=` is the search; every other value fills place links. */
export function splitQuery(query: RouteQuery): {
  focus: AnyMandateKey | null;
  context: Record<string, string>;
} {
  const context: Record<string, string> = {};
  let focus: AnyMandateKey | null = null;
  for (const [name, raw] of Object.entries(query)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) continue;
    // The page boundary: the one place a URL's `mandate=` enters the typed world.
    if (name === "mandate") focus = storedMandateKey(value);
    // The search box's own query (IntelligenceSearch) — never a place value.
    else if (name === "q") continue;
    else context[name] = value;
  }
  return { focus, context };
}

/** The page's name — the registry's words, never a raw id. */
export function intelligencePageTitle(page: string, tree: Tree): string {
  if (isLane(page)) return LANES[page];
  return `${tree.bySlug.get(page)?.name ?? page} intelligence`;
}

/** Is a job's home this page (the node or below it, or the same lane)? */
export function homeIsOnPage(home: string, page: string, tree: Tree): boolean {
  if (isLane(page) || isLane(home)) return home === page;
  return isWithin(tree, home, page);
}

export async function IntelligenceTargetRoute({
  target,
  tree,
  query,
}: {
  /** A registry node slug or a lane id. */
  target: string;
  tree: Tree;
  query: RouteQuery;
}) {
  const verdict = await getSessionVerdict();
  const path = `/intelligence/${target}`;
  if (!verdict.isAuthenticated) redirect(loginHref(path));

  const { focus, context } = splitQuery(query);
  // A focused job another page shows (an old link, a job that moved) opens there.
  if (focus) {
    const home = await homeOfKey(focus, verdict.user.id);
    if (home && !homeIsOnPage(home, target, tree)) redirect(intelligenceHref(focus, context));
  }
  const crumbs = isLane(target) ? [] : pathOf(tree, target);
  return (
    <>
      <PageHeader>
        <nav aria-label="Intelligence path" className="flex min-w-0 items-center gap-1 type-title">
          <Link href="/intelligence" className="shrink-0 text-muted-foreground hover:text-foreground">
            Intelligence
          </Link>
          {crumbs.length === 0 ? (
            <>
              <span className="shrink-0 text-muted-foreground" aria-hidden>›</span>
              <span className="truncate text-foreground">{intelligencePageTitle(target, tree)}</span>
            </>
          ) : (
            crumbs.map((node, index) =>
              index === crumbs.length - 1 ? (
                <Fragment key={node.slug}>
                  <span className="shrink-0 text-muted-foreground" aria-hidden>›</span>
                  <span className="truncate text-foreground" aria-current="page" title={node.name}>
                    {node.name}
                  </span>
                </Fragment>
              ) : (
                // On a phone only the page's own name shows; its parents stay in the tree.
                <span key={node.slug} className="flex min-w-0 shrink items-center gap-1 max-sm:hidden">
                  <span className="shrink-0 text-muted-foreground" aria-hidden>›</span>
                  <Link
                    href={`/intelligence/${encodeURIComponent(node.slug)}`}
                    className="min-w-0 truncate text-muted-foreground hover:text-foreground"
                    title={node.name}
                  >
                    {node.name}
                  </Link>
                </span>
              ),
            )
          )}
        </nav>
      </PageHeader>
      <div className="h-full overflow-y-auto overflow-x-hidden pt-[var(--shell-header-h)]">
        <FeatureIntelligence
          feature={target}
          context={context}
          focusMandateKey={focus}
          showTitle={false}
        />
      </div>
    </>
  );
}
