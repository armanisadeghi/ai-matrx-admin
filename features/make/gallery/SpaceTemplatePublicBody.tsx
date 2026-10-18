// features/make/gallery/SpaceTemplatePublicBody.tsx — ONE SPACE TEMPLATE'S PUBLIC PAGE (/templates/<slug>;
// Arman 2026-10-18 "Yes, public gallery"): anyone, signed in or not, sees what the template is, who it is for,
// what it makes (pages, tables, views) and its real pages LIVE over its sample rows, then "Use this template".
//
// Server-rendered from the one page read (public.template_public_page: card.space + spec + spec.spacePack); the
// only client islands are the preview (features/spaces/public/TemplatePackPreview, a fence entry point) and
// the use button. No other data is read.

import "@blocknote/shadcn/style.css";
import "@/features/spaces/spaces.css";

import Link from "next/link";
import { Suspense } from "react";

import type { TemplateSpec } from "@ai-matrx/records/templates";
import { siteConfig } from "@/config/extras/site";
import { TemplatePackPreview } from "@/features/spaces/public/TemplatePackPreview";
import { packPagesInOrder, type SpaceTemplateCardFace, type SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import { footprintLine, isSpaceCard, wordFor, type GalleryCard } from "./catalogue";
import { spacePageOutlines } from "./SpacePageOutline";
import { SpaceTemplateCardGrid, TemplateChip } from "./TemplateCards";
import { SpaceTemplateUseAction } from "./TemplateUseAction";
import type { ShowSpec } from "./TemplateShowcase";
import {
  industryHref,
  PUBLIC_GALLERY_PATH,
  publicTemplateHref,
  spaceCategoryLabel,
  spaceTemplateSignUpHref,
  spaceUseTemplateHref,
  workspacesHref,
  WORKSPACES_PATH,
} from "./publicGallery";

const RELATED = 6;
const USE_CLASS = "inline-flex h-10 items-center self-start rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground";

function relatedSpaces(card: GalleryCard, all: readonly GalleryCard[]): GalleryCard[] {
  const score = (c: GalleryCard) => (c.space?.category === card.space?.category ? 2 : 0) + (c.industry && c.industry === card.industry ? 1 : 0);
  return all
    .filter((c) => isSpaceCard(c) && c.catalogue_id !== card.catalogue_id && score(c) > 0)
    .sort((a, b) => score(b) - score(a) || (a.space?.title ?? "").localeCompare(b.space?.title ?? ""))
    .slice(0, RELATED);
}

export function SpaceTemplatePublicBody({
  card,
  space,
  spec,
  pack,
  updatedAt,
  all,
}: {
  card: GalleryCard;
  space: SpaceTemplateCardFace;
  spec: ShowSpec;
  pack: Omit<SpaceTemplatePack, "spec">;
  updatedAt: string | null;
  all: readonly GalleryCard[];
}) {
  const url = `${siteConfig.url}${publicTemplateHref(card)}`;
  const pages = packPagesInOrder(pack.pages);
  const views = spec.views ?? [];
  const related = relatedSpaces(card, all);
  const signUp = spaceTemplateSignUpHref(card);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: space.title,
      headline: space.title,
      description: space.description,
      audience: { "@type": "Audience", audienceType: space.forWho },
      url,
      genre: spaceCategoryLabel(space.category),
      keywords: [...space.tags, ...spec.tables.map((t) => t.name)].join(", "),
      isAccessibleForFree: true,
      dateModified: updatedAt ?? undefined,
      publisher: { "@type": "Organization", name: "AI Matrx", url: siteConfig.url },
      isPartOf: { "@type": "SoftwareApplication", name: "AI Matrx", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: siteConfig.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Templates", item: `${siteConfig.url}${PUBLIC_GALLERY_PATH}` },
        { "@type": "ListItem", position: 2, name: "Workspaces", item: `${siteConfig.url}${WORKSPACES_PATH}` },
        { "@type": "ListItem", position: 3, name: spaceCategoryLabel(space.category), item: `${siteConfig.url}${workspacesHref(space.category)}` },
        { "@type": "ListItem", position: 4, name: space.title, item: url },
      ],
    },
  ];

  return (
    <div className="bg-textured" data-public-template={card.slug ?? card.catalogue_id} data-public-space-template="">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href={PUBLIC_GALLERY_PATH} className="hover:text-foreground">
            Templates
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={WORKSPACES_PATH} className="hover:text-foreground">
            Workspaces
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={workspacesHref(space.category)} className="hover:text-foreground">
            {spaceCategoryLabel(space.category)}
          </Link>
        </nav>

        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{space.title}</h1>
            <p className="text-sm text-muted-foreground">{space.forWho}</p>
          </div>
          <p className="max-w-3xl text-base text-foreground">{space.description}</p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Link href={workspacesHref(space.category)}>
              <TemplateChip>{spaceCategoryLabel(space.category)}</TemplateChip>
            </Link>
            {card.industry && card.industry !== "cross_industry" ? (
              <Link href={industryHref(card.industry)}>
                <TemplateChip>{wordFor("industry", card.industry)}</TemplateChip>
              </Link>
            ) : null}
            {space.tags.map((t) => (
              <TemplateChip key={t}>{t}</TemplateChip>
            ))}
          </div>
          <Suspense
            fallback={
              <Link href={signUp} className={USE_CLASS}>
                Use this template
              </Link>
            }
          >
            <SpaceTemplateUseAction useHref={spaceUseTemplateHref(card)} signUpHref={signUp} />
          </Suspense>
        </header>

        <TemplatePackPreview
          template={{ id: card.id, catalogue_id: card.catalogue_id, version: card.version, spec: spec as unknown as TemplateSpec, pack }}
          outlines={spacePageOutlines(pages, spec)}
        />

        <section className="flex flex-col gap-3" aria-labelledby="space-template-inside">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="space-template-inside" className="text-lg font-semibold tracking-tight">
              What&apos;s inside
            </h2>
            <span className="text-sm text-muted-foreground tabular-nums">{footprintLine(card.footprint)}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-medium text-muted-foreground tabular-nums">{pages.length === 1 ? "1 page" : `${pages.length} pages`}</h3>
              <ul className="flex flex-col gap-1 text-sm" data-space-template-pages="">
                {pages.map((p) => (
                  <li key={p.key} className="truncate" style={{ paddingLeft: p.parent ? 16 : 0 }}>
                    {p.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-medium text-muted-foreground tabular-nums">
                {spec.tables.length === 1 ? "1 table" : `${spec.tables.length} tables`}
              </h3>
              <ul className="flex flex-col gap-1 text-sm" data-space-template-tables="">
                {spec.tables.map((t) => {
                  const own = views.filter((v) => v.table === t.token);
                  return (
                    <li key={t.token} className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="truncate">{t.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {own.length ? (own.length === 1 ? "1 view" : `${own.length} views`) : null}
                        {own.length && t.rows?.length ? " · " : null}
                        {t.rows?.length ? (t.rows.length === 1 ? "1 sample row" : `${t.rows.length} sample rows`) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>

        {related.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="template-related">
            <h2 id="template-related" className="text-lg font-semibold tracking-tight">
              Related workspaces
            </h2>
            <SpaceTemplateCardGrid cards={related} hrefFor={(c) => publicTemplateHref(c)} attr="data-public-template-related" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
