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

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { TemplateSpec } from "@ai-matrx/records/templates";

import type { LiveScreens } from "./TemplateLivePreviewImpl";

// ON DEMAND (GALLERY-PERF-2, 2026-10-19): the live screens load when the visitor reaches the preview (it scrolls
// into view, or a pointer or focus enters it), through ONE import() of TemplateLivePreviewImpl — never on page load.
// A failed load keeps the server HTML and says so in the console.
export function TemplateLivePreview({ spec, today, children }: { spec: TemplateSpec; today: string; children: ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const [Live, setLive] = useState<LiveScreens | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (wanted || !box || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setWanted(true);
    }, { rootMargin: "0px 0px -20% 0px" });
    seen.observe(box);
    return () => seen.disconnect();
  }, [wanted]);
  useEffect(() => {
    if (!wanted) return;
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
  }, [wanted]);
  const want = () => setWanted(true);
  return (
    <div
      ref={boxRef}
      className="min-h-[36rem] min-w-0"
      data-template-live={Live ? "on" : "off"}
      onPointerEnter={want}
      onFocusCapture={want}
      onTouchStart={want}
    >
      {Live ? <Live.Preview spec={spec} today={today} className="gap-6" booking={Live.booking} /> : children}
    </div>
  );
}
