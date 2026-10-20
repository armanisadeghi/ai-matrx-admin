"use client";

// features/spaces/public/TemplatePackPreview.tsx — a Space template's real pages on its public page
// (/templates/<slug>; Arman 2026-10-18 "Yes, public gallery"). A FENCE ENTRY POINT (scripts/check-spaces-fence.mjs).
//
// The same pages the in-app gallery previews (sidebar/TemplateGallery.tsx PackPreview): the pack's page tree
// resolved over its sample rows in memory (`previewPages`: registerSampleWorld → @ai-matrx/records/memory),
// drawn read-only by the editor. Nothing is written to any store.
//
// FIRST PAINT: the server draws the frame (the page rail, each page's cover, icon and title — `pages`, faces only)
// and every page's outline (text + real tables of the sample rows, SpacePageOutline) — what a crawler reads.
//
// ON DEMAND (GALLERY-PERF, 2026-10-19): the page carried the whole spec and pack as client props (71 KB of RSC
// payload, and the editor's code on first load). Now the island gets only the template's address and the page
// faces; when the visitor reaches the preview (it scrolls into view, or a pointer or focus enters it) the browser
// reads the template from the public door (loadPublicPackTemplate) and loads the editor, then swaps each outline for
// the live page. The box has a fixed height and scrolls inside, so the swap moves nothing. A failed read keeps the
// outline and says so in the console.
//
// ON PRESS ONLY (ADVERSARIAL-5 F1, 2026-10-20): on a template page this box is in the first screen, so "reached" (it
// scrolls into view, a pointer passes over it) fired on every visit and pulled the whole app (8.3 MB for a guest who
// never scrolled). The live editor now starts only on a press: the "See it live" button over the server-drawn
// snapshot, or a press anywhere in the box. Hover, focus and scrolling start nothing. Guard:
// features/make/__tests__/live-previews-start-only-on-a-press.test.tsx.

import { FileText, Play } from "lucide-react";
import { useFullPublicTierWhen } from "@/features/public-shell/publicTier";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { loadPublicPackTemplate } from "@/features/make/gallery/templatePage";

import type { SpaceBlock, SpaceDoc, SpaceMedia, SpaceSummary } from "../contract";
import type { SpaceEditor as SpaceEditorType } from "../editor/SpaceEditor";
import { Cover } from "../page/Cover";
import { SpaceIcon, isImageMedia } from "../page/SpaceIcon";
import { usePinnedTop } from "../page/usePinnedTop";
import { readOnlySpacesValue } from "../state/read-only-value";
import { StaticSpacesProvider } from "../state/SpacesProvider";
import type { SpaceTemplateFull } from "../templates/use-pack";

/** One page of the template as the server draws its frame: no blocks (those are the outline, then the live page). */
export interface PreviewPageFace {
  key: string;
  title: string;
  icon: SpaceMedia | null;
  cover: SpaceDoc["cover"];
  settings: SpaceDoc["settings"];
}

/** The live half, once loaded: each page's resolved blocks and the editor that draws them. */
interface Live {
  blocks: Map<string, SpaceBlock[]>;
  Editor: typeof SpaceEditorType;
}

const READ_ONLY = () => {
  throw new Error("This is a preview.");
};
const idOf = (key: string) => `preview-${key}`;

/**
 * `templateKey`: the template's public address (the live read asks the door with it). `pages`: the frame of each page.
 * `outlines`: each page's server-drawn first paint by page key (every page's outline is in the HTML, the current
 * one shown, so a crawler reads them all).
 */
export function TemplatePackPreview({
  templateKey,
  catalogueId,
  pages,
  outlines,
}: {
  templateKey: string;
  catalogueId: string;
  pages: PreviewPageFace[];
  outlines: Record<string, ReactNode>;
}) {
  const [pageKey, setPageKey] = useState<string | null>(null);
  const current = pages.find((p) => p.key === pageKey) ?? pages[0];
  const [wanted, setWanted] = useState(false);
  const [live, setLive] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  // On a light public page the live screens need the app tree first (store, query client, hosts).
  const appReady = useFullPublicTierWhen(wanted);

  useEffect(() => {
    if (!wanted || !appReady) return;
    let gone = false;
    void Promise.all([loadPublicPackTemplate(templateKey), import("../editor/SpaceEditor"), import("../templates/use-pack")]).then(
      ([template, editor, pack]) => {
        if (gone) return;
        const resolved = pack.previewPages(template as unknown as SpaceTemplateFull);
        setLive({ blocks: new Map(resolved.map((p) => [p.key, p.doc.blocks])), Editor: editor.SpaceEditor });
      },
      (error: unknown) => {
        if (gone) return;
        console.warn(`[templates] the live preview of ${templateKey} did not load; the outline stays.`, error);
        setFailed(true);
      },
    );
    return () => {
      gone = true;
    };
  }, [wanted, appReady, templateKey]);

  // Opens at the top with the title and cover in view, on load, when the editor replaces the outline and on every
  // page click — and the page around it stays put (ADVERSARIAL-2 #4: it opened 595px down).
  const scrollRef = useRef<HTMLDivElement>(null);
  usePinnedTop(scrollRef, `${catalogueId}:${current?.key ?? ""}:${live ? "live" : "outline"}`, { pinWindow: true });
  const summaries: SpaceSummary[] = pages.map((p) => ({
    id: idOf(p.key),
    parentId: null,
    position: "0",
    title: p.title,
    icon: p.icon ?? null,
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
  const want = () => setWanted(true);
  if (!current) return null;
  return (
    <div
      className="spaces-root relative flex h-[40rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
      data-space-template-preview={catalogueId}
      data-live={live ? "on" : failed ? "failed" : wanted ? "loading" : "off"}
      onPointerDown={want}
    >
      {live || failed ? null : (
        // ui-exception: the light public tier has no controls barrel in its graph (ADVERSARIAL-5 F1); one native button.
        <button
          type="button"
          onClick={want}
          disabled={wanted}
          data-see-it-live=""
          className="absolute right-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm"
        >
          <Play size={14} aria-hidden="true" />
          {wanted ? "Loading…" : "See it live"}
        </button>
      )}
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
            <span className="spaces-menu-row-icon">{p.icon ? <SpaceIcon media={p.icon} size={16} /> : <FileText size={16} />}</span>
            <span className="min-w-0 max-w-[14rem] flex-1 truncate text-left">{p.title}</span>
          </button>
        ))}
      </nav>
      <div ref={scrollRef} className="spaces-tg-page min-h-0 flex-1" data-space-template-preview-page="">
        <StaticSpacesProvider value={value}>
          <div
            className="spaces-page"
            data-full-width={current.settings.fullWidth ? "true" : undefined}
            data-small-text={current.settings.smallText ? "true" : undefined}
          >
            {current.cover ? <Cover cover={current.cover} editable={false} onChange={() => {}} /> : null}
            <div className="spaces-content">
              <div className="spaces-header" data-has-cover={current.cover ? "true" : undefined} data-has-icon={current.icon ? "true" : undefined}>
                {current.icon ? (
                  <span className="spaces-page-icon" data-image={isImageMedia(current.icon) ? "true" : undefined}>
                    <SpaceIcon media={current.icon} size={isImageMedia(current.icon) ? 136 : 78} />
                  </span>
                ) : null}
                <h2 className="spaces-title">{current.title}</h2>
              </div>
              {live ? (
                <live.Editor
                  key={`${catalogueId}:${current.key}`}
                  spaceId={idOf(current.key)}
                  initialBlocks={live.blocks.get(current.key) ?? []}
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
