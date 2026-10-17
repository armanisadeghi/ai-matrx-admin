/**
 * The public page of one shared comparison. Server-rendered from the public payload alone: the same
 * `ComparisonView` the signed-in page uses (read-only: no facts doors, no picker), a freshness line,
 * and one way in. Champions: Versus.com and Wirecutter's public comparison pages for the bones (verdict
 * first, every number on its own bar, a stamp of when it was checked), Linear's share links for the
 * restraint (a link opens straight onto the thing, with its actions beside the title and no chrome).
 */

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { ComparisonView } from "../components/ComparisonView";
import type { PublicComparison } from "./contract";
import { fetchedOn } from "./format";
import { CopyLinkButton, RefreshButton } from "./SharedActions";

export function SharedComparison({ shared, signedIn }: { shared: PublicComparison; signedIn: boolean }) {
  const when = fetchedOn(shared.fetchedAt);
  const canRefresh = signedIn && shared.refreshItems.length >= 2;
  return (
    <div className="bg-textured">
      <div className="mx-auto w-full max-w-5xl px-[var(--matrx-page-gutter,1rem)] py-8 sm:py-12">
        <ComparisonView
          result={shared.result}
          actions={
            <>
              <CopyLinkButton path={`/compare/s/${shared.slug}`} />
              {canRefresh ? <RefreshButton kind={shared.kind} items={shared.refreshItems} /> : null}
            </>
          }
        />
        {when ? (
          <p className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={shared.fetchedAt ?? undefined}>Facts fetched {when}</time>
          </p>
        ) : null}

        <section className="mt-12 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Compare your own</h2>
          <Button variant="primary" asChild>
            <Link href="/compare">
              Start a comparison
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
