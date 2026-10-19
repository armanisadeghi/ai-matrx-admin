// app/(public)/templates/category/[industry]/page.tsx — every template for one industry (lane CHAIR-GALLERY).
// Lit in the one category rail under the category its industry files under (publicGallery.ts INDUSTRY_CATEGORY).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INDUSTRY_GROUPS } from "@ai-matrx/records/templates";

import { createRouteMetadata } from "@/utils/route-metadata";
import { wordFor } from "@/features/make/gallery/catalogue";
import { galleryPageHref, pageParam, PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { industryHref, INDUSTRY_CATEGORY } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

type Props = { params: Promise<{ industry: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export function generateStaticParams() {
  return INDUSTRY_GROUPS.map((industry) => ({ industry }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { industry } = await params;
  const page = pageParam((await searchParams).page);
  const word = wordFor("industry", industry);
  return createRouteMetadata(industryHref(industry), {
    title: page > 1 ? `${word} templates, page ${page}` : `${word} templates`,
    description: `Ready-made ${word.toLowerCase()} tables, forms, booking pages and dashboards, filled with sample data. Pick one and it is yours in seconds.`,
    canonicalPath: galleryPageHref(industryHref(industry), "", page),
  });
}

export default async function IndustryTemplatesPage({ params, searchParams }: Props) {
  const { industry } = await params;
  const { q, page } = await searchParams;
  if (!(INDUSTRY_GROUPS as readonly string[]).includes(industry)) notFound();
  const read = await readPublicCatalogue();
  const all = read.state === "open" ? read.cards : [];
  const cards = all.filter((c) => c.industry === industry);
  return (
    <PublicGalleryPage
      title={`${wordFor("industry", industry)} templates`}
      cards={cards}
      all={all}
      path={industryHref(industry)}
      query={q ?? ""}
      page={pageParam(page)}
      active={INDUSTRY_CATEGORY[industry] ?? null}
      state={read.state}
    />
  );
}
