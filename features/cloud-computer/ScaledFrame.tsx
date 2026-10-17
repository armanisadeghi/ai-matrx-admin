"use client";

import React, { useEffect, useRef, useState } from "react";

/** A field a person types into in THIS document (the composer, a search box…). */
function isTypingField(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return true;
  if (el.isContentEditable) return true;
  const editable = el.getAttribute("contenteditable");
  return (editable !== null && editable !== "false") || el.getAttribute("role") === "textbox";
}

/** How long after a person's own press or key a focus move counts as theirs. */
const PERSON_ACT_MS = 600;

/**
 * Draws a remote screen of a fixed size (the stream's viewport) scaled to fit
 * whatever box it is given, so a small thumbnail and the full view are the same
 * single live frame (the stream allows one viewer connection at a time).
 *
 * `interactive` turns input on WITHOUT remounting the frame: watching and
 * controlling are one connection. While interactive the frame owns the
 * keyboard — it is focused when control starts and on every press on it, and
 * a field elsewhere on the page that grabs focus by itself (an autofocusing
 * composer, 2026-10-17: typing into the machine did nothing) hands it straight
 * back. A focus move that follows the person's own press or key in the page is
 * theirs and is left alone. Keys typed into the frame never reach the page
 * (cross-origin document), so the app's shortcuts cannot fire while it has focus.
 */
export function ScaledFrame({
  src,
  width,
  height,
  title,
  interactive,
  onLoad,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  interactive: boolean;
  onLoad?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth, clientHeight } = el;
      if (clientWidth > 0 && clientHeight > 0) {
        setScale(Math.min(clientWidth / width, clientHeight / height));
      }
    };
    measure();
    // Measure on the next frame, not inside the observer callback: a scale
    // set synchronously there re-lays out the panel mid-observation and the
    // browser reports "ResizeObserver loop completed with undelivered
    // notifications" (seen in the Error Inspector, 2026-10-16).
    let raf = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [width, height]);

  // Control starts: the keyboard goes to the machine.
  useEffect(() => {
    if (!interactive) return;
    const iframe = frame.current;
    if (!iframe) return;
    iframe.focus({ preventScroll: true });

    let lastPersonAct = 0;
    const personActed = () => {
      lastPersonAct = Date.now();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (target === iframe || !isTypingField(target)) return;
      if (Date.now() - lastPersonAct < PERSON_ACT_MS) return;
      // Nobody pressed anything in the page: something took the caret by itself.
      iframe.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", personActed, true);
    document.addEventListener("keydown", personActed, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", personActed, true);
      document.removeEventListener("keydown", personActed, true);
      document.removeEventListener("focusin", onFocusIn, true);
    };
  }, [interactive]);

  return (
    <div
      ref={box}
      className="relative h-full w-full overflow-hidden bg-muted"
      // A press on the letterbox around the picture still means "the machine".
      onPointerDown={interactive ? () => frame.current?.focus({ preventScroll: true }) : undefined}
    >
      <iframe
        ref={frame}
        src={src}
        title={title}
        aria-label={title}
        allow="autoplay; fullscreen; clipboard-read; clipboard-write; keyboard-map"
        referrerPolicy="no-referrer"
        tabIndex={interactive ? 0 : -1}
        onLoad={() => {
          // The page inside loaded after control began: focus it now.
          if (interactive) frame.current?.focus({ preventScroll: true });
          onLoad?.();
        }}
        className="absolute left-1/2 top-1/2 border-0"
        style={{
          width,
          height,
          transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
          transformOrigin: "center center",
          pointerEvents: interactive ? "auto" : "none",
          visibility: scale ? "visible" : "hidden",
        }}
      />
    </div>
  );
}
