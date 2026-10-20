"use client";

// features/make/gallery/TemplateLivePreview.tsx — lanes CHAIR-GALLERY-2 / -3 (Unified Data System v7), 2026-10-05.
//
// THE TEMPLATE, ON THE REAL SCREENS. Arman: people must SEE exactly what they will get. When the visitor
// reaches the preview this mounts @ai-matrx/records-ui's TemplatePreview over the template installed into
// memory (@ai-matrx/records/memory): the canonical table page (grid, board, calendar, timeline, gallery,
// list; a click opens the record page), the forms on the real FormRunner, the booking pages on this
// app's own booking page (BookingPicker, the page a stranger's link opens) and the dashboards on the
// real canvas. Read-only: nothing is read from or written to any store; a send is refused in a sentence.
//
// Until then the server HTML passed as `children` stays on screen — it is what a crawler reads and what
// first paint shows — and it is swapped for the live screens only once their code has loaded, in a box
// that keeps its height, so nothing jumps.

import { useFullPublicTierWhen } from "@/features/public-shell/publicTier";
import { Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { TemplateSpec } from "@ai-matrx/records/templates";

import type { LiveScreens } from "./TemplateLivePreviewImpl";

// ON DEMAND (GALLERY-PERF-2, 2026-10-19): the live screens load when the visitor reaches the preview (it scrolls
// into view, or a pointer or focus enters it), through ONE import() of TemplateLivePreviewImpl — never on page load.
// A failed load keeps the server HTML and says so in the console.
// ON PRESS ONLY (ADVERSARIAL-5 F1, 2026-10-20): "reached" fired at once whenever the preview sat in the first screen,
// pulling the whole app for a guest who never scrolled. The live screens now start only on a press: the "See it live"
// button over the server HTML, or a press anywhere in the box. Guard: live-previews-start-only-on-a-press.test.tsx.
export function TemplateLivePreview({ spec, today, children }: { spec: TemplateSpec; today: string; children: ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const [Live, setLive] = useState<LiveScreens | null>(null);
  // On a light public page the live screens need the app tree first (store, query client, hosts).
  const appReady = useFullPublicTierWhen(wanted);
  useEffect(() => {
    if (!wanted || !appReady) return;
    let gone = false;
    void import("./TemplateLivePreviewImpl")
      .then((m) => m.loadLiveScreens())
      .then(
        (screens) => {
          if (!gone) setLive(screens);
        },
        (error: unknown) => {
          if (!gone) console.warn("[templates] the live preview did not load; the outline stays.", error);
        },
      );
    return () => {
      gone = true;
    };
  }, [wanted, appReady]);
  const want = () => setWanted(true);
  return (
    <div className="relative min-h-[36rem] min-w-0" data-template-live={Live ? "on" : wanted ? "loading" : "off"} onPointerDown={want}>
      {Live ? null : (
        // ui-exception: the light public tier has no controls barrel in its graph (ADVERSARIAL-5 F1); one native button.
        <button
          type="button"
          onClick={want}
          disabled={wanted}
          data-see-it-live=""
          className="absolute right-0 top-0 z-10 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm"
        >
          <Play size={14} aria-hidden="true" />
          {wanted ? "Loading…" : "See it live"}
        </button>
      )}
      {Live ? <Live.Preview spec={spec} today={today} className="gap-6" booking={Live.booking} /> : children}
    </div>
  );
}
