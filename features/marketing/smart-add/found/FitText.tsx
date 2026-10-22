"use client";

/**
 * A domain or handle on a found card: one unbroken word, never split inside. It takes the card's type size and
 * shrinks (down to FLOOR of it) until it fits its slot; only below the floor does it wrap, after a dot, dash or
 * underscore (anywhere, for one unbroken run), so it is never clipped at the card edge.
 * The line's height is held at the full size from the first frame, so a shrunk name moves nothing around it.
 */

import { Fragment, useLayoutEffect, useRef, useState } from "react";

export const FIT_FLOOR = 0.5;

/** The scale (FIT_FLOOR..1) that makes `natural` px of text fit `room` px; null when even the floor does not fit. */
export function fitScale(natural: number, room: number): number | null {
  if (natural <= 0 || room <= 0 || natural <= room) return 1;
  const s = room / natural;
  const v = Math.floor(s * 99) / 100;
  return v >= FIT_FLOOR ? v : null;
}

/** Where a domain or handle may break once past the floor: after a dot, a dash or an underscore. */
export function fitBreaks(text: string): string[] {
  return text.split(/(?<=[._-])/);
}

export function FitText({ text }: { text: string }) {
  const box = useRef<HTMLSpanElement>(null);
  // An invisible full-size, unbroken copy: the text's natural width whatever the visible copy is doing (shrunk or
  // wrapped). Measuring the visible copy fed its own state back in (live 2026-10-21: max-width capped the read, it
  // said "fits", and the handle ran past the card edge at 375px).
  const probe = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<number | null>(1);

  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current;
      const p = probe.current;
      if (!b || !p) return;
      setFit(fitScale(p.scrollWidth, b.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    // A web font landing after the first measure changes the text's width: measure again.
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [text]);

  // Past the floor the text may break: after a dot, a dash or an underscore (a domain, a LinkedIn handle), and a
  // single unbroken run past the edge wraps anywhere rather than be clipped (live 2026-10-21 at 375px).
  const parts = fit === null ? fitBreaks(text) : [text];
  return (
    <span
      ref={box}
      className="relative block min-w-0 leading-[1.1]"
      style={fit === null ? { minHeight: "1.1em" } : { height: "1.1em" }}
      data-fit-text={fit === null ? "wrap" : String(fit)}
    >
      <span ref={probe} aria-hidden className="invisible absolute left-0 top-0 w-0 overflow-hidden whitespace-nowrap">
        {text}
      </span>
      <span
        className="inline-block max-w-full align-bottom"
        style={{
          fontSize: `${(fit ?? FIT_FLOOR) * 100}%`,
          whiteSpace: fit === null ? "normal" : "nowrap",
          overflowWrap: fit === null ? "anywhere" : "normal",
          wordBreak: "normal",
        }}
      >
        {parts.map((p, n) => (
          <Fragment key={n}>
            {n > 0 ? <wbr /> : null}
            {p}
          </Fragment>
        ))}
      </span>
    </span>
  );
}
