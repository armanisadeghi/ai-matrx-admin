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
import { isSkipped, slideTransitionOf } from "../deck-slide-ops";

export function DeckPresenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: (at: number) => void }) {
  const [at, setAt] = useState(() => {
    const list = deck.slides.map((sl, i) => (isSkipped(sl) ? -1 : i)).filter((i) => i >= 0);
    return list.find((i) => i >= start) ?? list[list.length - 1] ?? Math.max(0, Math.min(start, deck.slides.length - 1));
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const atRef = useRef(at);
  useEffect(() => {
    atRef.current = at;
  }, [at]);
  // Skipped slides stay in the deck but are not part of the show.
  const play = deck.slides.map((sl, i) => (isSkipped(sl) ? -1 : i)).filter((i) => i >= 0);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  const step = (from: number, dir: 1 | -1) => {
    const list = playRef.current;
    if (list.length === 0) return from;
    const next = dir > 0 ? list.find((i) => i > from) : [...list].reverse().find((i) => i < from);
    return next ?? from;
  };
  const last = play.length ? play[play.length - 1]! : deck.slides.length - 1;

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
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) setAt((n) => step(n, 1));
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) setAt((n) => step(n, -1));
      else if (e.key === "Home") setAt(playRef.current[0] ?? 0);
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
      onClick={() => setAt((n) => step(n, 1))}
    >
      <style>{`@keyframes deck-trans-fade{from{opacity:0}to{opacity:1}}@keyframes deck-trans-slide{from{transform:translateX(100%)}to{transform:none}}@keyframes deck-trans-zoom{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:none}}@keyframes deck-trans-flip{from{opacity:0;transform:perspective(900px) rotateY(80deg)}to{opacity:1;transform:none}}`}</style>
      <div key={at} className="h-full w-full" data-slide-transition={slideTransitionOf(deck.slides[at]).kind} style={slideTransitionOf(deck.slides[at]).kind === "none" ? undefined : { animation: `deck-trans-${slideTransitionOf(deck.slides[at]).kind} ${slideTransitionOf(deck.slides[at]).ms}ms ease-out both` }}>
        <PaperSlide deck={deck} slide={deck.slides[at]} slideNumber={at + 1} fullScreen className="h-full w-full" />
      </div>
      <div
        className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-neutral-900/90 px-2 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="quiet" icon={<ChevronLeft />} aria-label="Previous slide" className="text-white" disabled={step(at, -1) === at} onClick={() => setAt((n) => step(n, -1))} />
        <span className="min-w-14 text-center text-xs tabular-nums" aria-live="polite">
          {at + 1} / {deck.slides.length}
        </span>
        <Button variant="quiet" icon={<ChevronRight />} aria-label="Next slide" className="text-white" disabled={step(at, 1) === at} onClick={() => setAt((n) => step(n, 1))} />
        <Button variant="quiet" icon={<X />} aria-label="Exit presentation" className="text-white" onClick={() => onClose(atRef.current)} />
      </div>
    </div>
  );
}
