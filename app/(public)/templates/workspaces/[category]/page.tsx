// record-view: none — addressed by a catalog key (category), not a record id
// app/(public)/templates/workspaces/[category]/page.tsx — ONE CATEGORY: its workspaces and the single-table
// templates of the industries filed under it (publicGallery.ts INDUSTRY_CATEGORY: one category system).
// Categories come from the catalog itself, so a category the template library adds later gets its page. A category
// the library names is never a 404 (an empty one says so); an unknown key 404s only after a fresh catalog read
// finds nothing in it (ADVERSARIAL-2 #11: /templates/workspaces/manufacturing 404'd while its packs were live).

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SPACE_TEMPLATE_CATEGORIES } from "@/lib/spaces-blocks/template-pack";
import { createRouteMetadata } from "@/utils/route-metadata";
import { galleryPageHref, pageParam, PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { cardCategory, spaceCategoryLabel, workspacesHref } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue, readPublicCatalogueFresh } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const category = decodeURIComponent((await params).category);
  const page = pageParam((await searchParams).page);
  const word = spaceCategoryLabel(category);
  return createRouteMetadata(workspacesHref(category), {
    title: page > 1 ? `${word} templates, page ${page}` : `${word} templates`,
    description: `Ready-made ${word.toLowerCase()} workspaces and tables, filled with sample data. Preview every page, then make it yours.`,
    canonicalPath: galleryPageHref(workspacesHref(category), "", page),
  });
}

export default async function WorkspaceCategoryPage({ params, searchParams }: Props) {
  const category = decodeURIComponent((await params).category);
  const { q, page } = await searchParams;
  const named = SPACE_TEMPLATE_CATEGORIES.some((c) => c.key === category);
  let read = await readPublicCatalogue();
  const inCategory = (r: typeof read) => (r.state === "open" ? r.cards.filter((c) => cardCategory(c) === category) : []);
  if (read.state === "open" && !named && !inCategory(read).length) {
    read = await readPublicCatalogueFresh();
    if (read.state === "open" && !inCategory(read).length) notFound();
  }
  const all = read.state === "open" ? read.cards : [];
  return (
    <PublicGalleryPage
      title={`${spaceCategoryLabel(category)} templates`}
      cards={inCategory(read)}
      all={all}
      path={workspacesHref(category)}
      query={q ?? ""}
      page={pageParam(page)}
      active={category}
      state={read.state}
    />
  );
}
