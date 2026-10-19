// app/(public)/templates/workspaces/page.tsx — every Space template (Arman 2026-10-18 "Yes, public gallery"):
// the platform `custom.template` rows whose card carries `space`, from the one public catalog read; `?q=` searches them.

import type { Metadata } from "next";

import { createRouteMetadata } from "@/utils/route-metadata";
import { isSpaceCard } from "@/features/make/gallery/catalogue";
import { galleryPageHref, pageParam, PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { WORKSPACES_PATH } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

type Search = Promise<{ q?: string; page?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const page = pageParam((await searchParams).page);
  return createRouteMetadata(WORKSPACES_PATH, {
    title: page > 1 ? `Workspace templates, page ${page}` : "Workspace templates",
    description: "Ready-made workspaces: pages, tables, boards and calendars filled with sample data. Preview every page, then make it yours.",
    canonicalPath: galleryPageHref(WORKSPACES_PATH, "", page),
  });
}

export default async function WorkspaceTemplatesPage({ searchParams }: { searchParams: Search }) {
  const { q, page } = await searchParams;
  const read = await readPublicCatalogue();
  const all = read.state === "open" ? read.cards : [];
  return <PublicGalleryPage title="Workspace templates" cards={all.filter(isSpaceCard)} all={all} path={WORKSPACES_PATH} query={q ?? ""} page={pageParam(page)} state={read.state} />;
}
