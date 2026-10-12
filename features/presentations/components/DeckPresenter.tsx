"use client";

/**
 * Present — the deck full screen on black, one slide at a time (Google Slides' Present):
 * → / Space / PageDown / click = next, ← / PageUp = previous, Home / End, Esc ends.
 * Uses the browser's real full screen when it is allowed; the overlay works without it.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { Deck } from "../deck-model";
import { PaperSlide } from "../slide-paper";

export function DeckPresenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: (at: number) => void }) {
  const [at, setAt] = useState(() => Math.max(0, Math.min(start, deck.slides.length - 1)));
  const rootRef = useRef<HTMLDivElement>(null);
  const atRef = useRef(at);
  useEffect(() => {
    atRef.current = at;
  }, [at]);
  const last = deck.slides.length - 1;

  useEffect(() => {
    const el = rootRef.current;
    let entered = false;
    if (el?.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          entered = true;
        })
        .catch(() => {
          // Full screen refused (iframe, permissions): the overlay still covers the window.
        });
    }
    const onFs = () => {
      if (entered && !document.fullscreenElement) onClose(atRef.current);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) setAt((n) => Math.min(last, n + 1));
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) setAt((n) => Math.max(0, n - 1));
      else if (e.key === "Home") setAt(0);
      else if (e.key === "End") setAt(last);
      else if (e.key === "Escape") onClose(atRef.current);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [last, onClose]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Presenting"
      data-deck-presenter=""
      className="group fixed inset-0 z-[200] flex items-center justify-center bg-black"
      onClick={() => setAt((n) => Math.min(last, n + 1))}
    >
      <PaperSlide deck={deck} slide={deck.slides[at]} fullScreen className="h-full w-full" />
      <div
        className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-neutral-900/90 px-2 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="quiet" icon={<ChevronLeft />} aria-label="Previous slide" className="text-white" disabled={at === 0} onClick={() => setAt((n) => Math.max(0, n - 1))} />
        <span className="min-w-14 text-center text-xs tabular-nums" aria-live="polite">
          {at + 1} / {deck.slides.length}
        </span>
        <Button variant="quiet" icon={<ChevronRight />} aria-label="Next slide" className="text-white" disabled={at === last} onClick={() => setAt((n) => Math.min(last, n + 1))} />
        <Button variant="quiet" icon={<X />} aria-label="Exit presentation" className="text-white" onClick={() => onClose(atRef.current)} />
      </div>
    </div>
  );
}
