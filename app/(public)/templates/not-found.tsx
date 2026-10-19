// app/(public)/templates/not-found.tsx — a template or category address that answers nothing (a real 404,
// ADVERSARIAL-2 #12): the gallery's search and its categories one click away, never a dead end.

import Link from "next/link";

import { GallerySearch } from "@/features/make/gallery/GallerySearch";
import { PUBLIC_GALLERY_PATH, WORKSPACES_PATH } from "@/features/make/gallery/publicGallery";

export default function TemplateNotFound() {
  return (
    <div className="bg-textured" data-public-templates-not-found="">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-5 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Template not found</h1>
        <GallerySearch path={PUBLIC_GALLERY_PATH} query="" placeholder="Search templates: plumber, kanban, budget…" />
        <div className="flex flex-wrap gap-4 type-body">
          <Link href={PUBLIC_GALLERY_PATH} className="text-primary hover:underline">
            All templates
          </Link>
          <Link href={WORKSPACES_PATH} className="text-primary hover:underline">
            Workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}
