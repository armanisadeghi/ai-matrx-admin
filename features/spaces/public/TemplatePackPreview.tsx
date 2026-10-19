"use client";

// features/spaces/public/TemplatePackPreview.tsx — a Space template's real pages on its public page
// (/templates/<slug>; Arman 2026-10-18 "Yes, public gallery"). A FENCE ENTRY POINT (scripts/check-spaces-fence.mjs).
//
// The same pages the in-app gallery previews (sidebar/TemplateGallery.tsx PackPreview): the pack's page tree
// resolved over its sample rows in memory (`previewPages`: registerSampleWorld → @ai-matrx/records/memory),
// drawn read-only by the editor. Nothing is read from or written to any store; the data is the one catalogue
// read the server page already made (public.template_public_page).
//
// FIRST PAINT: BlockNote reads `window` while it creates the editor (see PublicSpace), so the server draws each
// page's frame (cover, icon, title) and the host's outline (text + real tables of the sample rows, SpacePageOutline)
// — what a crawler reads — and the browser swaps the outline for the editor. The box has a fixed height and scrolls inside, so the swap moves nothing around it.

import { FileText } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import type { TemplateSpec } from "@ai-matrx/records/templates";
import type { SpaceTemplatePack } from "@/lib/spaces-blocks/template-pack";

import type { SpaceSummary } from "../contract";
import { SpaceEditor } from "../editor/SpaceEditor";
import { Cover } from "../page/Cover";
import { SpaceIcon, isImageMedia } from "../page/SpaceIcon";
import { usePinnedTop } from "../page/usePinnedTop";
import { readOnlySpacesValue } from "../state/read-only-value";
import { StaticSpacesProvider } from "../state/SpacesProvider";
import { previewPages, type SpaceTemplateFull } from "../templates/use-pack";

/** The template, as its public page read it: the spec's tables and sample rows, and its page pack. */
export interface PublicPackTemplate {
  id: string;
  catalogue_id: string;
  version: number;
  spec: TemplateSpec;
  pack: Omit<SpaceTemplatePack, "spec">;
}

const NO_SUBSCRIBE = () => () => undefined;
const READ_ONLY = () => {
  throw new Error("This is a preview.");
};
const idOf = (key: string) => `preview-${key}`;

/**
 * `outlines`: each page's server-drawn first paint by page key (the host renders them on the server: real tables of the
 * sample rows, the text). Every page's outline is in the HTML (the current one shown) so a crawler reads them all.
 */
export function TemplatePackPreview({ template, outlines }: { template: PublicPackTemplate; outlines: Record<string, ReactNode> }) {
  const inBrowser = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => true,
    () => false,
  );
  const pages = previewPages(template as unknown as SpaceTemplateFull);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const current = pages.find((p) => p.key === pageKey) ?? pages[0];
  // Opens at the top with the title and cover in view, on load, when the editor replaces the outline and on every
  // page click — and the page around it stays put (ADVERSARIAL-2 #4: it opened 595px down).
  const scrollRef = useRef<HTMLDivElement>(null);
  usePinnedTop(scrollRef, `${template.id}:${current?.key ?? ""}:${inBrowser ? "live" : "outline"}`, { pinWindow: true });
  const summaries: SpaceSummary[] = pages.map((p) => ({
    id: idOf(p.key),
    parentId: null,
    position: "0",
    title: p.title,
    icon: p.doc.icon ?? null,
    isArchived: false,
    updatedAt: "",
  }));
  const byId = new Map(summaries.map((s) => [s.id, s]));
  const value = readOnlySpacesValue({
    pages: summaries,
    open: (id) => setPageKey(id.slice("preview-".length)),
    pageHref: () => "#",
    missingPageLabel: "Not in this template",
    refusal: "This is a preview.",
    publicSite: true,
    linkTarget: (id) => byId.get(id) ?? null,
  });
  if (!current) return null;
  return (
    <div
      className="spaces-root flex h-[40rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
      data-space-template-preview={template.catalogue_id}
      data-live={inBrowser ? "on" : "off"}
    >
      <nav
        aria-label="Template pages"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
      >
        {pages.map((p) => (
          <button
            key={p.key}
            type="button"
            className="spaces-tg-rail-row w-auto shrink-0 md:w-full"
            data-active={current.key === p.key ? "true" : undefined}
            aria-current={current.key === p.key ? "page" : undefined}
            onClick={() => setPageKey(p.key)}
          >
            <span className="spaces-menu-row-icon">{p.doc.icon ? <SpaceIcon media={p.doc.icon} size={16} /> : <FileText size={16} />}</span>
            <span className="min-w-0 max-w-[14rem] flex-1 truncate text-left">{p.title}</span>
          </button>
        ))}
      </nav>
      <div ref={scrollRef} className="spaces-tg-page min-h-0 flex-1" data-space-template-preview-page="">
        <StaticSpacesProvider value={value}>
          <div
            className="spaces-page"
            data-full-width={current.doc.settings.fullWidth ? "true" : undefined}
            data-small-text={current.doc.settings.smallText ? "true" : undefined}
          >
            {current.doc.cover ? <Cover cover={current.doc.cover} editable={false} onChange={() => {}} /> : null}
            <div className="spaces-content">
              <div className="spaces-header" data-has-cover={current.doc.cover ? "true" : undefined} data-has-icon={current.doc.icon ? "true" : undefined}>
                {current.doc.icon ? (
                  <span className="spaces-page-icon" data-image={isImageMedia(current.doc.icon) ? "true" : undefined}>
                    <SpaceIcon media={current.doc.icon} size={isImageMedia(current.doc.icon) ? 136 : 78} />
                  </span>
                ) : null}
                <h2 className="spaces-title">{current.title}</h2>
              </div>
              {inBrowser ? (
                <SpaceEditor
                  key={`${template.id}:${current.key}`}
                  spaceId={idOf(current.key)}
                  initialBlocks={current.doc.blocks}
                  editable={false}
                  onChange={() => {}}
                  slash={{ createSubpage: READ_ONLY, pickPage: async () => null, pickSource: async () => null, newDatabase: async () => null }}
                  menu={{ moveBlocksTo: READ_ONLY, turnIntoPageIn: READ_ONLY, askAi: () => {} }}
                />
              ) : (
                pages.map((p) => (
                  <div key={p.key} hidden={p.key !== current.key}>
                    {outlines[p.key] ?? null}
                  </div>
                ))
              )}
            </div>
          </div>
        </StaticSpacesProvider>
      </div>
    </div>
  );
}
