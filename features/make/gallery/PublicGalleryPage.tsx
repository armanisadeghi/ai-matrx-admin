// features/make/gallery/PublicGalleryPage.tsx — lane CHAIR-GALLERY, 2026-10-05.
//
// THE GALLERY'S PAGES at /templates, /templates/category/<industry> and /templates/job/<job>: one
// server-rendered layout (heading, industry and job links, the cards with their live thumbnails).
// The index groups the catalog by industry; a category or job page lists every template in it.
// WORKSPACES (Arman 2026-10-18 "Yes, public gallery"): Space templates (card.space with pages) come first in
// their own section, filterable by Space category (/templates/workspaces/<category>); the table templates follow.

import Link from "next/link";

import { signUpHref } from "@/utils/auth/auth-destination";
import { cn } from "@/lib/utils";

import { facetValues, isSpaceCard, wordFor, type GalleryCard } from "./catalogue";
import { SpaceTemplateCardGrid, TemplateCardGrid } from "./TemplateCards";
import { industryHref, jobHref, PUBLIC_GALLERY_PATH, publicTemplateHref, spaceCategories, spaceCategoryLabel, workspacesHref } from "./publicGallery";

/** Cards per industry on the index; the industry's own page lists them all. */
const PER_GROUP_ON_INDEX = 6;

export function PublicGalleryPage({
  title,
  cards,
  all,
  active,
  grouped = false,
  workspaces = false,
  state,
}: {
  title: string;
  cards: readonly GalleryCard[];
  /** The whole catalog, for the industry and job links. */
  all: readonly GalleryCard[];
  active?: { industry?: string; job?: string; space?: string };
  grouped?: boolean;
  /** The Workspaces pages: Space categories instead of the industry and job links. */
  workspaces?: boolean;
  state: string;
}) {
  const industries = facetValues(all, "industry");
  const jobs = facetValues(all, "job");
  const spaceCards = cards.filter(isSpaceCard);
  const tableCards = cards.filter((c) => !isSpaceCard(c));
  const categories = spaceCategories(all.filter(isSpaceCard));
  return (
    <div className="bg-textured" data-public-templates={state}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {active ? (
              <Link href={PUBLIC_GALLERY_PATH} className="type-body text-muted-foreground hover:text-foreground">
                All templates
              </Link>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <span className="type-body text-muted-foreground tabular-nums">{cards.length} templates</span>
          </div>
          <Link
            href={signUpHref(PUBLIC_GALLERY_PATH)}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 type-title text-primary-foreground hover:bg-primary/90"
            data-public-templates-signup=""
          >
            Sign up free
          </Link>
        </header>

        {workspaces && categories.length > 1 ? (
          <nav aria-label="Workspace category" className="flex flex-wrap gap-2 type-body" data-public-templates-space-categories="">
            <FacetLink href={workspacesHref()} active={!active?.space}>
              All workspaces
            </FacetLink>
            {categories.map((v) => (
              <FacetLink key={v} href={workspacesHref(v)} active={active?.space === v}>
                {spaceCategoryLabel(v)}
              </FacetLink>
            ))}
          </nav>
        ) : null}
        {!workspaces && industries.length > 1 ? (
          <nav aria-label="Industry" className="flex flex-wrap gap-2 type-body" data-public-templates-industries="">
            {industries.map((v) => (
              <FacetLink key={v} href={industryHref(v)} active={active?.industry === v}>
                {wordFor("industry", v)}
              </FacetLink>
            ))}
          </nav>
        ) : null}
        {!workspaces && jobs.length > 1 ? (
          <nav aria-label="Job" className="flex flex-wrap gap-2 type-body" data-public-templates-jobs="">
            {jobs.map((v) => (
              <FacetLink key={v} href={jobHref(v)} active={active?.job === v}>
                {wordFor("job", v)}
              </FacetLink>
            ))}
          </nav>
        ) : null}

        {cards.length === 0 ? (
          <p className="type-body text-muted-foreground" data-public-templates-empty="">
            No public templates yet
          </p>
        ) : null}

        {spaceCards.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="templates-workspaces" data-public-templates-workspaces="">
            {workspaces ? null : (
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="templates-workspaces" className="text-lg font-semibold tracking-tight">
                  Workspaces
                </h2>
                <Link href={workspacesHref()} className="type-body text-primary hover:underline">
                  All {grouped ? all.filter(isSpaceCard).length : spaceCards.length}
                </Link>
              </div>
            )}
            {grouped && categories.length > 1 ? (
              <nav aria-label="Workspace category" className="flex flex-wrap gap-2 type-body" data-public-templates-space-categories="">
                {categories.map((v) => (
                  <FacetLink key={v} href={workspacesHref(v)} active={false}>
                    {spaceCategoryLabel(v)}
                  </FacetLink>
                ))}
              </nav>
            ) : null}
            <SpaceTemplateCardGrid
              cards={grouped ? spaceCards.slice(0, PER_GROUP_ON_INDEX) : spaceCards}
              hrefFor={(c) => publicTemplateHref(c)}
              attr="data-public-templates-space-cards"
            />
          </section>
        ) : null}

        {tableCards.length === 0 ? null : grouped ? (
          industries.map((industry) => {
            const inGroup = tableCards.filter((c) => c.industry === industry);
            if (!inGroup.length) return null;
            return (
              <section key={industry} className="flex flex-col gap-3" aria-labelledby={`templates-${industry}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id={`templates-${industry}`} className="text-lg font-semibold tracking-tight">
                    {wordFor("industry", industry)}
                  </h2>
                  <Link href={industryHref(industry)} className="type-body text-primary hover:underline">
                    All {inGroup.length}
                  </Link>
                </div>
                <TemplateCardGrid cards={inGroup.slice(0, PER_GROUP_ON_INDEX)} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-cards" />
              </section>
            );
          })
        ) : (
          <TemplateCardGrid cards={tableCards} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-cards" />
        )}
      </div>
    </div>
  );
}

function FacetLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "max-w-[16rem] truncate rounded-full border px-3 py-1",
        active ? "border-primary bg-primary/10 text-primary-ink" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
