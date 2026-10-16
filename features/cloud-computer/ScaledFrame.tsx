"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Draws a remote screen of a fixed size (the stream's viewport) scaled to fit
 * whatever box it is given, so a small thumbnail and the full view are the same
 * single live frame (the stream allows one viewer connection at a time).
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
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden bg-muted">
      <iframe
        src={src}
        title={title}
        aria-label={title}
        allow="autoplay; fullscreen; clipboard-read; clipboard-write"
        referrerPolicy="no-referrer"
        tabIndex={interactive ? 0 : -1}
        onLoad={onLoad}
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
