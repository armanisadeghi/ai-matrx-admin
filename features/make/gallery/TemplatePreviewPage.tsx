"use client";

// features/make/gallery/TemplatePreviewPage.tsx — LANE MAKE-HOME, wave 4: the /make/templates/<id>
// page chrome (the shell header with Back, the scrolling body). Everything it shows is
// `TemplatePreview` (TemplateGallery.tsx), the one file that reaches the store.

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";

import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";

import { galleryFilter } from "./catalogue";
import { TemplatePreview, readCatalogue, templatePreviewHref } from "./TemplateGallery";

/** The template crumb's door: the other templates, through the gallery's own catalog read, capped. */
async function templateSiblings(templateId: string): Promise<CrumbOption[]> {
  const { cards } = await readCatalogue(galleryFilter({}));
  return cards.slice(0, SIBLINGS_MAX).map((c) => ({ label: c.name || "Untitled template", href: templatePreviewHref(c.id), active: c.id === templateId }));
}

export default function TemplatePreviewPage({ templateId }: { templateId: string }) {
  return (
    <>
      <RecordPageHeader backHref="/make" record={{ name: "Template", loadSiblings: () => templateSiblings(templateId) }} />
      <div className="h-full overflow-y-auto overflow-x-hidden bg-textured">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-[calc(var(--shell-header-h)+1.25rem)] sm:px-6">
          <TemplatePreview templateId={templateId} />
        </div>
      </div>
    </>
  );
}
