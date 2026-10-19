// app/(public)/templates/workspaces/page.tsx — every Space template (Arman 2026-10-18 "Yes, public gallery"):
// the platform `custom.template` rows whose card carries `space`, from the one public catalog read; `?q=` searches them.

import type { Metadata } from "next";

import { createRouteMetadata } from "@/utils/route-metadata";
import { isSpaceCard } from "@/features/make/gallery/catalogue";
import { PublicGalleryPage } from "@/features/make/gallery/PublicGalleryPage";
import { WORKSPACES_PATH } from "@/features/make/gallery/publicGallery";
import { readPublicCatalogue } from "@/features/make/gallery/publicCatalogue.server";

export const revalidate = 60;

export const metadata: Metadata = createRouteMetadata(WORKSPACES_PATH, {
  title: "Workspace templates",
  description: "Ready-made workspaces: pages, tables, boards and calendars filled with sample data. Preview every page, then make it yours.",
  canonicalPath: WORKSPACES_PATH,
});

export default async function WorkspaceTemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const read = await readPublicCatalogue();
  const all = read.state === "open" ? read.cards : [];
  return <PublicGalleryPage title="Workspace templates" cards={all.filter(isSpaceCard)} all={all} path={WORKSPACES_PATH} query={q ?? ""} state={read.state} />;
}
