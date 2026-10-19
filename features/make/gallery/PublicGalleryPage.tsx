// features/make/gallery/PublicGalleryPage.tsx — THE PUBLIC TEMPLATE GALLERY's one layout (/templates, its
// workspace and category pages, the industry and job pages). Server-rendered from the one catalog read, so a
// signed-out visitor, a signed-in person and a crawler read the same cards.
//
// GALLERY-UX (ADVERSARIAL-2; bar: notion.com/templates — a search box, one category rail, a curated featured row,
// a picture on every card; we add what it lacks: the search is a link that a crawler reads, results show the
// template's real rows, and every category holds both workspaces and single tables):
//   · SEARCH (?q=) through the one template search (publicGallery.ts searchGallery → lib/spaces-blocks/template-search.ts);
//   · ONE category rail: the Space categories; a table template files under its industry's category
//     (INDUSTRY_CATEGORY), so there is no second, industry rail. On a phone the rail is one scrolling row and the
//     cards follow at once;
//   · FEATURED: the hand-picked FEATURED_SPACE_TEMPLATES, never the first six alphabetically;
//   · every card has a picture (TemplateCards), drawn on the server: no image loads, nothing moves.

import Link from "next/link";

import { siteConfig } from "@/config/extras/site";
import { signUpHref } from "@/utils/auth/auth-destination";
import { cn } from "@/lib/utils";

import { isSpaceCard, wordFor, type GalleryCard } from "./catalogue";
import { GallerySearch } from "./GallerySearch";
import { SpaceTemplateCardGrid, TemplateCardGrid } from "./TemplateCards";
import {
  cardCategory,
  featuredCards,
  galleryCategories,
  industryHref,
  PUBLIC_GALLERY_PATH,
  publicTemplateHref,
  searchGallery,
  spaceCategoryLabel,
  workspacesHref,
} from "./publicGallery";

/** Cards per category on the hub; the category's own page lists them all. */
const PER_CATEGORY_ON_HUB = 3;
/** Cards named in a page's ItemList (JSON-LD). */
const LISTED = 30;

export function PublicGalleryPage({
  title,
  cards,
  all,
  path,
  query = "",
  hub = false,
  active,
  state,
}: {
  title: string;
  /** The cards this page lists (and searches). */
  cards: readonly GalleryCard[];
  /** The whole catalog, for the category rail and its counts. */
  all: readonly GalleryCard[];
  /** This page's address: where the search form goes. */
  path: string;
  /** The search (`?q=`); "" = none. */
  query?: string;
  /** /templates: featured + every category, a few cards each. */
  hub?: boolean;
  /** The category this page is (or files under), lit in the rail. */
  active?: string | null;
  state: string;
}) {
  const q = query.trim();
  const found = q ? searchGallery(cards, q) : [...cards];
  const spaces = found.filter(isSpaceCard);
  const tables = found.filter((c) => !isSpaceCard(c));
  const categories = galleryCategories(all);
  const listed = (q ? found : hub ? featuredCards(all) : found).slice(0, LISTED);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: `${siteConfig.url}${path}`,
    isPartOf: { "@type": "WebSite", name: "AI Matrx", url: siteConfig.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: found.length,
      itemListElement: listed.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.space?.title ?? c.name,
        url: `${siteConfig.url}${publicTemplateHref(c)}`,
      })),
    },
  };

  return (
    <div className="bg-textured" data-public-templates={state}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-16 pt-8 sm:px-6 lg:gap-8 lg:px-8 lg:pt-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              {hub ? null : (
                <Link href={PUBLIC_GALLERY_PATH} className="type-body text-muted-foreground hover:text-foreground">
                  All templates
                </Link>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
              <span className="type-body text-muted-foreground tabular-nums" data-public-templates-count="">
                {q ? `${found.length} of ${cards.length} templates` : `${cards.length.toLocaleString("en-US")} templates`}
              </span>
            </div>
            <Link
              href={signUpHref(path)}
              className="inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-4 type-title text-primary-foreground hover:bg-primary/90"
              data-public-templates-signup=""
            >
              Sign up free
            </Link>
          </div>
          <GallerySearch key={path} path={path} query={q} placeholder="Search templates: plumber, kanban, budget…" />
        </header>

        <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          <CategoryRail categories={categories} active={hub && !q ? null : (active ?? null)} total={all.length} />

          <div className="flex min-w-0 flex-col gap-10" data-public-templates-results={q ? found.length : undefined}>
            {cards.length === 0 ? (
              <p className="type-body text-muted-foreground" data-public-templates-empty="">
                No public templates yet
              </p>
            ) : q && !found.length ? (
              <p className="type-body text-muted-foreground" data-public-templates-no-match="">
                No templates match “{q}”.{" "}
                <Link href={path} className="text-primary hover:underline">
                  Show all
                </Link>
              </p>
            ) : hub && !q ? (
              <HubSections cards={found} />
            ) : (
              <>
                {spaces.length ? (
                  <Section id="templates-workspaces" title="Workspaces" count={spaces.length}>
                    <SpaceTemplateCardGrid cards={spaces} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-space-cards" />
                  </Section>
                ) : null}
                {tables.length ? (
                  <Section id="templates-tables" title="Single tables" count={tables.length}>
                    <TemplateCardGrid cards={tables} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-cards" />
                  </Section>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** /templates with no search: the featured row, then every category with its first few workspaces, then single tables by industry. */
function HubSections({ cards }: { cards: readonly GalleryCard[] }) {
  const featured = featuredCards(cards);
  const categories = galleryCategories(cards.filter(isSpaceCard));
  const tables = cards.filter((c) => !isSpaceCard(c));
  const industries = [...new Set(tables.map((c) => c.industry).filter((i): i is string => Boolean(i)))].sort((a, b) =>
    wordFor("industry", a).localeCompare(wordFor("industry", b)),
  );
  return (
    <>
      {featured.length ? (
        <Section id="templates-featured" title="Featured">
          <SpaceTemplateCardGrid cards={featured} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-featured" />
        </Section>
      ) : null}
      {categories.map(({ key, count }) => {
        const inCategory = cards.filter((c) => isSpaceCard(c) && cardCategory(c) === key);
        return (
          <Section key={key} id={`templates-${key}`} title={spaceCategoryLabel(key)} count={count} more={{ href: workspacesHref(key), label: `All ${count}` }}>
            <SpaceTemplateCardGrid cards={inCategory.slice(0, PER_CATEGORY_ON_HUB)} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-space-cards" />
          </Section>
        );
      })}
      {tables.length ? (
        <section className="flex flex-col gap-6" aria-labelledby="templates-tables" data-public-templates-tables="">
          <h2 id="templates-tables" className="text-xl font-semibold tracking-tight text-foreground">
            Single tables <span className="type-body font-normal text-muted-foreground tabular-nums">{tables.length}</span>
          </h2>
          {industries.map((industry) => {
            const inGroup = tables.filter((c) => c.industry === industry);
            return (
              <Section
                key={industry}
                id={`templates-industry-${industry}`}
                title={wordFor("industry", industry)}
                level={3}
                count={inGroup.length}
                more={{ href: industryHref(industry), label: `All ${inGroup.length}` }}
              >
                <TemplateCardGrid cards={inGroup.slice(0, PER_CATEGORY_ON_HUB)} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-templates-cards" />
              </Section>
            );
          })}
        </section>
      ) : null}
    </>
  );
}

function Section({
  id,
  title,
  count,
  more,
  level = 2,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  more?: { href: string; label: string };
  level?: 2 | 3;
  children: React.ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <Heading id={id} className={cn("min-w-0 truncate font-semibold tracking-tight text-foreground", level === 2 ? "text-xl" : "text-base")}>
          {title}
          {count !== undefined && !more ? <span className="ml-2 type-body font-normal text-muted-foreground tabular-nums">{count}</span> : null}
        </Heading>
        {more ? (
          <Link href={more.href} className="shrink-0 type-body text-primary hover:underline">
            {more.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * THE ONE RAIL: every category with its count. Desktop: a sticky column beside the cards. Phone: one row that
 * scrolls sideways, so the cards start right under it (ADVERSARIAL-2 #7: 25 wrapped chips pushed every card below the fold).
 */
function CategoryRail({ categories, active, total }: { categories: Array<{ key: string; count: number }>; active: string | null; total: number }) {
  return (
    <nav
      aria-label="Template categories"
      className="-mx-4 min-w-0 px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-[calc(var(--shell-header-h,3.5rem)+1.5rem)] lg:mx-0 lg:px-0"
      data-public-templates-categories=""
    >
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:max-h-[calc(100dvh-var(--shell-header-h,3.5rem)-3rem)] lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
        <RailItem href={PUBLIC_GALLERY_PATH} active={active === null} label="All templates" count={total} />
        {categories.map(({ key, count }) => (
          <RailItem key={key} href={workspacesHref(key)} active={active === key} label={spaceCategoryLabel(key)} count={count} />
        ))}
      </ul>
    </nav>
  );
}

function RailItem({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <li className="shrink-0 lg:shrink">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 type-body lg:justify-between lg:rounded-md lg:border-transparent lg:px-2.5",
          active
            ? "border-primary bg-primary/10 text-primary-ink lg:border-transparent"
            : "border-border bg-card text-foreground hover:bg-muted lg:bg-transparent",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="type-meta text-muted-foreground tabular-nums">{count}</span>
      </Link>
    </li>
  );
}
