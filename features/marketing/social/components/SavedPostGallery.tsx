"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadUrl } from "@ai-matrx/kit/download";
import { fetchPlaybackUrl, socialErrorMessage } from "../server";
import type { PostMediaRef } from "../types";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
/** The thumbnail is a preview, never an additional carousel slide. Preserve the server's source order. */
export function savedPostSlides(media: readonly PostMediaRef[]): PostMediaRef[] {
  return media.filter(file => file.role !== "thumbnail" && (
    file.role.startsWith("image") || file.role.startsWith("video") ||
    file.mime_type?.startsWith("image/") || file.mime_type?.startsWith("video/")
  ));
}

export function SavedPostGallery({ files, organizationId, onRatio, fill }: {
  files: readonly PostMediaRef[];
  organizationId: string;
  onRatio: (ratio: number) => void;
  fill?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const selected = Math.min(index, files.length - 1);
  const file = files[selected];
  const pointerX = useRef<number | null>(null);
  if (!file) return null;
  return (
    <div
      className="relative h-full w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Saved post media"
      tabIndex={0}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") { event.preventDefault(); setIndex(Math.min(files.length - 1, selected + 1)); }
        if (event.key === "ArrowLeft") { event.preventDefault(); setIndex(Math.max(0, selected - 1)); }
      }}
      onPointerDown={event => { pointerX.current = event.clientX; }}
      onPointerUp={event => {
        const start = pointerX.current;
        pointerX.current = null;
        if (start === null || event.target instanceof HTMLVideoElement || event.target instanceof HTMLButtonElement) return;
        if (event.clientX < start - 40) setIndex(Math.min(files.length - 1, selected + 1));
        if (event.clientX > start + 40) setIndex(Math.max(0, selected - 1));
      }}
      onPointerCancel={() => { pointerX.current = null; }}
    >
      <ArchivedSlide key={`${organizationId}:${file.file_id}`} file={file} organizationId={organizationId} onRatio={onRatio} fill={fill} position={selected + 1} />
      {files.length > 1 ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-1 right-1 flex items-center justify-between">
            <Button className="pointer-events-auto" variant="outline" icon={<ChevronLeft />} aria-label="Previous saved slide" disabled={selected === 0} onClick={() => setIndex(selected - 1)} />
            <Button className="pointer-events-auto" variant="outline" icon={<ChevronRight />} aria-label="Next saved slide" disabled={selected === files.length - 1} onClick={() => setIndex(selected + 1)} />
          </div>
          <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] tabular-nums text-white" aria-live="polite">{selected + 1} / {files.length} saved</span>
        </>
      ) : null}
    </div>
  );
}

function ArchivedSlide({ file, organizationId, onRatio, fill, position }: {
  file: PostMediaRef; organizationId: string; onRatio: (ratio: number) => void; fill?: boolean; position: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isVideo = file.mime_type?.startsWith("video/") || file.role.startsWith("video");
  useEffect(() => {
    const abort = new AbortController();
    let url: string | null = null;
    setSrc(null); setError(null);
    void fetchPlaybackUrl(file.door, { organizationId, signal: abort.signal }).then(next => {
      if (abort.signal.aborted) URL.revokeObjectURL(next);
      else { url = next; setSrc(next); }
    }).catch(failure => {
      if (!abort.signal.aborted) setError(socialErrorMessage(failure, "Couldn't load this slide"));
    });
    return () => { abort.abort(); if (url) URL.revokeObjectURL(url); };
  }, [file.door, organizationId, attempt]);
  return (
    <div role="group" aria-roledescription="slide" aria-label={`Saved slide ${position}`} className="absolute inset-0 flex items-center justify-center">
      {error ? (
        <div className="flex flex-col items-center gap-2 px-4 text-center text-white">
          <span className="text-sm">{error}<ErrorAlchemyMenu error={error} /></span>
          {src ? <Button variant="outline" icon={<Download />} onClick={() => downloadUrl(src, file.file_id)}>Download saved file</Button> : <Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Try again</Button>}
        </div>
      ) : src ? isVideo ? (
        <video src={src} controls playsInline className="h-full w-full object-contain" onError={() => setError("Preview unavailable")} onLoadedMetadata={event => {
          const video = event.currentTarget; if (!fill && video.videoWidth && video.videoHeight) onRatio(video.videoWidth / video.videoHeight);
        }} />
      ) : (
        <img src={src} alt={`Saved slide ${position}`} className="h-full w-full object-contain" onError={() => setError("Preview unavailable")} onLoad={event => {
          const image = event.currentTarget; if (!fill && image.naturalWidth && image.naturalHeight) onRatio(image.naturalWidth / image.naturalHeight);
        }} />
      ) : <Loader2 className="h-6 w-6 animate-spin text-white" aria-label="Loading saved slide" />}
    </div>
  );
}
