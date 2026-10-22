"use client";

import { useEffect, useRef, useState } from "react";
import type { ThumbnailQueue } from "./pdfThumbnails";

/** One page thumbnail: asks the shared queue only once it is on screen; a shimmer holds its place until then. */
export function PdfThumbnail({ page, queue }: { page: number; queue: ThumbnailQueue | null }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = box.current;
    if (!node || typeof IntersectionObserver === "undefined") return setVisible(true) as unknown as undefined;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "200px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !queue) return undefined;
    let live = true;
    queue.request(page).then(
      (url) => live && setSrc(url),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [visible, queue, page]);

  return (
    <div ref={box} className="flex h-full w-full items-center justify-center bg-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- an object URL of a page drawn in this tab
        <img src={src} alt="" draggable={false} className="h-full w-full object-contain" />
      ) : failed ? (
        <span className="text-xs text-muted-foreground">{page}</span>
      ) : (
        <span className="h-full w-full animate-pulse bg-muted" aria-hidden="true" />
      )}
    </div>
  );
}
