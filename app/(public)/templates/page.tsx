// app/(public)/templates/page.tsx — THE TEMPLATE GALLERY, one route for everyone (lane CHAIR-GALLERY,
// 2026-10-05; first public in MAKE-HOME wave 4b; GALLERY-UX 2026-10-19: search, one category rail, featured).
// Server-rendered from the public catalog door, so a signed-out visitor, a signed-in person and a crawler read the
// same cards; `?q=` is a search a person can link and a crawler can read.

import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import { createRouteMetadata } from "@/utils/route-metadata";
import { PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { industryHref, PUBLIC_GALLERY_PATH } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

export const metadata: Metadata = createRouteMetadata(PUBLIC_GALLERY_PATH, {
  title: "Templates",
  description: "Ready-made workspaces, tables, boards and dashboards for your business, filled with sample data. Search, preview every page, make it yours.",
  canonicalPath: PUBLIC_GALLERY_PATH,
});

export default async function PublicTemplatesPage({ searchParams }: { searchParams: Promise<{ industry?: string; q?: string }> }) {
  const { industry, q } = await searchParams;
  if (industry) permanentRedirect(industryHref(industry));
  const read = await readPublicCatalogue();
  const cards = read.state === "open" ? read.cards : [];
  return <PublicGalleryPage title="Templates" cards={cards} all={cards} path={PUBLIC_GALLERY_PATH} query={q ?? ""} hub state={read.state} />;
}
