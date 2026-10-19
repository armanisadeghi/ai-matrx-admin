// app/(public)/templates/job/[job]/page.tsx — every template that does one job (lane CHAIR-GALLERY).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TEMPLATE_JOBS } from "@ai-matrx/records/templates";

import { createRouteMetadata } from "@/utils/route-metadata";
import { wordFor } from "@/features/make/gallery/catalogue";
import { galleryPageHref, pageParam, PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { jobHref } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

type Props = { params: Promise<{ job: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export function generateStaticParams() {
  return TEMPLATE_JOBS.map((job) => ({ job }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { job } = await params;
  const page = pageParam((await searchParams).page);
  const word = wordFor("job", job);
  return createRouteMetadata(jobHref(job), {
    title: page > 1 ? `${word} templates, page ${page}` : `${word} templates`,
    description: `Ready-made templates for ${word.toLowerCase()}: tables, forms, booking pages and dashboards with sample data, for every kind of business.`,
    canonicalPath: galleryPageHref(jobHref(job), "", page),
  });
}

export default async function JobTemplatesPage({ params, searchParams }: Props) {
  const { job } = await params;
  const { q, page } = await searchParams;
  if (!(TEMPLATE_JOBS as readonly string[]).includes(job)) notFound();
  const read = await readPublicCatalogue();
  const all = read.state === "open" ? read.cards : [];
  const cards = all.filter((c) => c.job === job);
  return <PublicGalleryPage title={`${wordFor("job", job)} templates`} cards={cards} all={all} path={jobHref(job)} query={q ?? ""} page={pageParam(page)} state={read.state} />;
}
