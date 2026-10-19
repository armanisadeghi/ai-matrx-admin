// app/(public)/templates/workspaces/[category]/page.tsx — the Space templates of one Space category.
// Categories come from the catalog itself, so a category the template library adds later gets its page.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createRouteMetadata } from "@/utils/route-metadata";
import { isSpaceCard } from "@/features/make/gallery/catalogue";
import { PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { spaceCategoryLabel, workspacesHref } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = decodeURIComponent((await params).category);
  const word = spaceCategoryLabel(category);
  return createRouteMetadata(workspacesHref(category), {
    title: `${word} workspace templates`,
    description: `Ready-made ${word.toLowerCase()} workspaces: pages, tables, boards and calendars filled with sample data. Preview every page, then make it yours.`,
    canonicalPath: workspacesHref(category),
  });
}

export default async function WorkspaceCategoryPage({ params }: Props) {
  const category = decodeURIComponent((await params).category);
  const read = await readPublicCatalogue();
  const all = read.state === "open" ? read.cards : [];
  const cards = all.filter((c) => isSpaceCard(c) && c.space?.category === category);
  if (read.state === "open" && !cards.length) notFound();
  return (
    <PublicGalleryPage title={`${spaceCategoryLabel(category)} workspaces`} cards={cards} all={all} active={{ space: category }} workspaces state={read.state} />
  );
}
