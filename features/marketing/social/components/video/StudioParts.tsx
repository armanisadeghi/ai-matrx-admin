"use client";

/**
 * Pieces the clone page and the project studio share: the live run log (shimmer on the step that is running),
 * the cost line (points), caption-look tiles drawn from the engine's real
 * CAPTION_PRESETS, the composition preview (the engine's resolver + VideoPlayer) and an output download row.
 */

import { formatDurationMs } from "@ai-matrx/kit/format";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Download, Film } from "lucide-react";

import type { Composition } from "@ai-matrx/media/video";
import { resolveComposition } from "@ai-matrx/media/video";
import { CAPTION_PRESETS, CAPTION_PRESET_IDS, CAPTION_SAMPLE_CANVAS, CAPTION_SAMPLE_LOOP_FRAMES, captionSampleHtml, loadVideoFonts, programInputFromComposition } from "@ai-matrx/media/video/engine";
import { VideoPlayer } from "@ai-matrx/media/video/react";
import { Badge, Button, EmptyState, Switch } from "@ai-matrx/design-system/controls";
import { downloadFile, downloadUrl } from "@ai-matrx/kit/download";
import { useMediaClient } from "@ai-matrx/media/core";

import { toast } from "@/lib/toast";

import { ShimmerText } from "@ai-matrx/design-system";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { cn } from "@/lib/utils";

import { CostDoor } from "@/components/cost/CostDoor";
import { zipEntryNames } from "../../video/variants";
import { plainFailureText } from "../../video/render-errors";
import { isSessionExpired, useExpiredSessionGuard } from "../../video/session";
import { useFileUrls } from "../../video/studio-hooks";

// ── run log ─────────────────────────────────────────────────────────────────────────────────────────

export interface RunStep {
  id: string;
  label: string;
  state: "running" | "done" | "failed";
  meta?: string;
  /** When the step started (set when it is pushed running); a running step shows how long it has been going. */
  startedAt?: number;
}

/** "42s" / "2m 05s": how long a step has taken. */
export function secondsText(ms: number): string {
  return formatDurationMs(ms, { style: "compact" });
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/** Steps of a running job, newest last; the running step shimmers. */
export function RunLog({ steps, className }: { steps: RunStep[]; className?: string }) {
  const now = useNow(steps.some((s) => s.state === "running"));
  if (steps.length === 0) return null;
  return (
    <ol className={cn("flex flex-col gap-1", className)} aria-live="polite">
      {steps.map((s) => (
        <li key={s.id} className="flex min-w-0 items-center gap-2 type-meta">
          {s.state === "done" ? (
            <Check className="size-3.5 shrink-0 text-success" />
          ) : s.state === "failed" ? (
            <CircleAlert className="size-3.5 shrink-0 text-destructive" />
          ) : (
            <span className="size-3.5 shrink-0" />
          )}
          {s.state === "running" ? (
            <ShimmerText text={s.label} className="truncate text-foreground" />
          ) : (
            <span className={cn("truncate", s.state === "failed" ? "text-destructive" : "text-muted-foreground")}>{s.label}</span>
          )}
          {s.meta ? (
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{s.meta}</span>
          ) : s.state === "running" && s.startedAt ? (
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{secondsText(now - s.startedAt)}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Push a step: the previous running step is marked done. */
export function pushStep(steps: RunStep[], step: RunStep): RunStep[] {
  const closed = steps.map((s) => (s.state === "running" && s.id !== step.id ? finish(s, "done") : s));
  const at = closed.findIndex((s) => s.id === step.id);
  const before = at >= 0 ? closed[at] : undefined;
  const next: RunStep =
    step.state === "running"
      ? { ...step, startedAt: before?.startedAt ?? step.startedAt ?? Date.now() }
      : { ...step, meta: step.meta ?? tookText(before) };
  if (at >= 0) {
    const out = [...closed];
    out[at] = next;
    return out;
  }
  return [...closed, next];
}

export function closeSteps(steps: RunStep[], state: "done" | "failed" = "done"): RunStep[] {
  return steps.map((s) => (s.state === "running" ? finish(s, state) : s));
}

/** A finished step keeps how long it took when that was noticeable (3 s or more): where the wait went. */
function finish(s: RunStep, state: "done" | "failed"): RunStep {
  return { ...s, state, meta: s.meta ?? tookText(s) };
}

function tookText(s: RunStep | undefined): string | undefined {
  const took = s?.startedAt ? Date.now() - s.startedAt : 0;
  return took >= 3000 ? secondsText(took) : undefined;
}

// ── cost ────────────────────────────────────────────────────────────────────────────────────────────

/** The estimate: its label, with the price behind the quiet Cost door. */
export function CostLine({ pts, label }: { pts: number | null | undefined; label?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums">
      {label ? <span className="type-meta text-muted-foreground">{label}</span> : null}
      <CostDoor points={pts} />
    </span>
  );
}

// ── caption looks ───────────────────────────────────────────────────────────────────────────────────

/** Content color (the dark video frame captions sit on), not interface chrome. */
const VIDEO_FRAME_BG = "#1c1f26";

let fontsRequested = false;

function useVideoFonts() {
  useEffect(() => {
    if (fontsRequested) return;
    fontsRequested = true;
    void loadVideoFonts().catch(() => {
      fontsRequested = false;
    });
  }, []);
}

/** One caption look drawn from the preset itself (font, case, colors, outline, active-word style). */
function CaptionSample({ presetId }: { presetId: string }) {
  const p = CAPTION_PRESETS[presetId];
  if (!p) return null;
  const words = ["this", "changes", "everything"];
  // Stroke is in px at a 1080-wide canvas for text fontSizePct% of that width; scale it to the 13px sample.
  const sampleScale = 13 / Math.max(1, (p.fontSizePct / 100) * 1080);
  const stroke = p.strokeWidthPx > 0 ? `${Math.max(0.5, p.strokeWidthPx * sampleScale).toFixed(2)}px ${p.strokeColor}` : undefined;
  return (
    <span
      className="flex flex-wrap items-center justify-center gap-x-1 px-1 text-center leading-tight"
      style={{
        fontFamily: `"${p.fontFamily}", sans-serif`,
        fontWeight: p.fontWeight,
        fontSize: 13,
        textTransform: p.uppercase ? "uppercase" : "none",
        letterSpacing: p.letterSpacingEm ? `${p.letterSpacingEm}em` : undefined,
        background: p.backdrop,
        borderRadius: p.backdrop ? 6 : undefined,
        padding: p.backdrop ? "2px 6px" : undefined,
      }}
    >
      {words.map((w, i) => {
        const active = i === 1;
        const boxed = active && p.active === "box";
        return (
          <span
            key={w}
            style={{
              color: active ? (boxed ? (p.boxTextColor ?? p.color) : p.activeColor) : p.color,
              WebkitTextStroke: boxed ? undefined : stroke,
              paintOrder: "stroke fill",
              background: boxed ? p.activeColor : undefined,
              borderRadius: boxed ? 4 : undefined,
              padding: boxed ? "0 3px" : undefined,
              textShadow: p.shadow,
              transform: active && p.active === "pop" ? "scale(1.15)" : undefined,
              display: "inline-block",
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}

/**
 * One caption look drawn live by the engine's own renderer (`captionSampleHtml`) on its 1080x480 canvas, scaled to the
 * tile. It shows the static sample until the tile first comes near the screen, then animates only while the tile is
 * in view (and stands still for people who ask for reduced motion), so 16 tiles never run 16 loops at once.
 */
const SAMPLE_FPS = 15;
function LiveCaptionSample({ presetId }: { presetId: string }) {
  const box = useRef<HTMLSpanElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [frame, setFrame] = useState(0);
  const [scale, setScale] = useState(0);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / CAPTION_SAMPLE_CANVAS.width));
    ro.observe(el);
    setScale(el.clientWidth / CAPTION_SAMPLE_CANVAS.width);
    const io = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      setInView(on);
      if (on) setSeen(true);
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!inView || typeof window === "undefined") return;
    // Reduced motion: hold one telling frame instead of looping.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setFrame(Math.floor(CAPTION_SAMPLE_LOOP_FRAMES / 2));
      return;
    }
    const started = performance.now();
    const timer = window.setInterval(() => {
      setFrame(Math.floor(((performance.now() - started) * 30) / 1000) % CAPTION_SAMPLE_LOOP_FRAMES);
    }, 1000 / SAMPLE_FPS);
    return () => window.clearInterval(timer);
  }, [inView]);
  const html = seen && scale > 0 ? captionSampleHtml(presetId, frame) : "";
  return (
    <span ref={box} className="relative block w-full overflow-hidden" style={{ aspectRatio: `${CAPTION_SAMPLE_CANVAS.width} / ${CAPTION_SAMPLE_CANVAS.height}`, background: VIDEO_FRAME_BG }}>
      {html ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 block origin-top-left"
          style={{ width: CAPTION_SAMPLE_CANVAS.width, height: CAPTION_SAMPLE_CANVAS.height, transform: `scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <CaptionSample presetId={presetId} />
        </span>
      )}
    </span>
  );
}

export function CaptionLookPicker({
  value,
  onChange,
  disabled,
  extra,
  follow,
  onFollowChange,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Leading choices that are not presets (e.g. "Match the reference", "No captions"). */
  extra?: ReadonlyArray<{ id: string; label: string }>;
  /** Captions sit by the speaking person's head (any look); shown only when `onFollowChange` is given. */
  follow?: boolean;
  onFollowChange?: (on: boolean) => void;
}) {
  useVideoFonts();
  return (
    <div className="flex flex-col gap-2">
    {onFollowChange ? (
      <label className="flex items-center gap-2">
        <Switch checked={!!follow} disabled={disabled} onCheckedChange={onFollowChange} aria-label="Follow the speaker" />
        <span className="type-label text-foreground">Follow the speaker</span>
      </label>
    ) : null}
    <div role="radiogroup" aria-label="Caption look" className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
      {(extra ?? []).map((x) => (
        <button
          key={x.id}
          type="button"
          role="radio"
          aria-checked={value === x.id}
          disabled={disabled}
          onClick={() => onChange(x.id)}
          data-clickable
          className={cn(
            "flex h-20 flex-col items-center justify-center gap-1 rounded-lg border bg-card p-1",
            value === x.id ? "border-primary ring-1 ring-primary" : "border-border",
          )}
        >
          <span className="type-label text-foreground">{x.label}</span>
        </button>
      ))}
      {CAPTION_PRESET_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          data-clickable
          className={cn(
            "flex min-w-0 flex-col overflow-hidden rounded-lg border",
            value === id ? "border-primary ring-1 ring-primary" : "border-border",
          )}
        >
          {/* A video frame stand-in: captions are drawn over footage, so the tile is a fixed dark frame in both themes. */}
          <LiveCaptionSample presetId={id} />
          <span className="type-meta truncate bg-card px-1 py-0.5 text-foreground">{CAPTION_PRESETS[id]?.label ?? id}</span>
        </button>
      ))}
    </div>
    </div>
  );
}

// ── preview ─────────────────────────────────────────────────────────────────────────────────────────

/** File ids every media item of the document points at (stored files only). */
export function mediaFileIds(doc: Composition): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, m] of Object.entries(doc.media)) {
    const src = m.source as { type?: string; fileId?: string };
    if (src?.type === "file" && src.fileId) out[id] = src.fileId;
  }
  return out;
}

export function pendingMediaCount(doc: Composition): number {
  return Object.values(doc.media).filter((m) => (m.source as { type?: string })?.type === "pending").length;
}

/**
 * The composition, played by the engine's own player over the resolved timeline. A document the resolver refuses
 * (a voice not generated yet, a voice edit waiting for a new take) says why instead of showing a broken frame.
 */
/**
 * Mounts its children only once they come near the screen, and keeps them mounted after. A grid of 25 variant previews
 * would otherwise start 25 players (fonts, files, decoders) at once; this starts the ones a person is looking at.
 */
export function MountWhenVisible({ children, ratio, className }: { children: React.ReactNode; ratio: string; className?: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return seen ? <>{children}</> : <div ref={box} className={cn("rounded-lg bg-muted", className)} style={{ aspectRatio: ratio }} aria-hidden />;
}

export function CompositionPreview({ doc, className }: { doc: Composition; className?: string }) {
  const client = useMediaClient();
  const readMediaBytes = useCallback(async (mediaId: string): Promise<ArrayBuffer | null> => {
    const source = doc.media[mediaId]?.source;
    if (source?.type !== "file" || !source.fileId) return null;
    const handle = await client.getBlob({ file_id: source.fileId });
    try { return await handle.blob.arrayBuffer(); }
    finally { handle.release(); }
  }, [client, doc]);
  const byMedia = mediaFileIds(doc);
  const { facts, pending, failed } = useFileUrls(Object.values(byMedia));
  const resolved = resolveComposition(doc);
  const ratio = `${doc.timeline.width} / ${doc.timeline.height}`;
  if (!resolved.ok) {
    const first = resolved.errors[0];
    const waiting = resolved.errors.some((e) => e.code === "take-pending");
    const stale = resolved.errors.some((e) => e.code === "alignment-stale" || e.code === "alignment-missing");
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-border bg-muted", className)} style={{ aspectRatio: ratio }}>
        <EmptyState
          icon={<Film />}
          title={waiting ? "Generate to preview" : stale ? "Voice needs regenerating" : "Preview unavailable"}
          line={waiting ? "The voice is not made yet" : stale ? "The script changed what is spoken" : (first?.message ?? "")}
        />
      </div>
    );
  }
  const mediaUrls: Record<string, string> = {};
  for (const [mid, fid] of Object.entries(byMedia)) {
    const url = facts[fid]?.url;
    if (url) mediaUrls[mid] = url;
  }
  if (!pending && failed.length > 0) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-border bg-muted", className)} style={{ aspectRatio: ratio }}>
        <EmptyState icon={<Film />} title="Files unavailable" line={`${failed.length} of ${new Set(Object.values(byMedia)).size} files didn't load. Check the files server.`} />
      </div>
    );
  }
  if (pending) {
    return <div className={cn("animate-pulse rounded-lg bg-muted", className)} style={{ aspectRatio: ratio }} aria-label="Loading preview" />;
  }
  return (
    <div className={className}>
      <VideoPlayer input={programInputFromComposition(doc, resolved.timeline)} mediaUrls={mediaUrls} readMediaBytes={readMediaBytes} hideTranscript />
    </div>
  );
}

// ── outputs ─────────────────────────────────────────────────────────────────────────────────────────

export function OutputDownload({ fileId, label, fileName }: { fileId: string; label: string; fileName?: string }) {
  const client = useMediaClient();
  const { facts } = useFileUrls([fileId]);
  const f = facts[fileId];
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      // The bytes come through the media door as a blob so the file saves under its name (a cross-origin link
      // would only open in a tab).
      const handle = await client.getBlob({ file_id: fileId, mime_type: "video/mp4" });
      downloadUrl(handle.url, fileName ?? f?.name ?? `${label}.mp4`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't download the video");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge tone="success">mp4</Badge>
      <span className="type-label truncate text-foreground">{label}</span>
      <Button variant="outline" icon={<Download />} className="ml-auto" disabled={busy} onClick={() => void save()}>
        {busy ? "Downloading…" : "Download"}
      </Button>
    </div>
  );
}

/**
 * One zip of many finished videos ("download all"): 25 variants are 25 clicks otherwise. Each video comes through the media
 * door as a blob and is stored (mp4 is already compressed) in a zip written in the browser; the zip.js library loads only when
 * pressed. Entries keep distinct names; one video that cannot be read is named in the message and the rest are still zipped.
 */
export function ZipAllButton({ items, zipName }: { items: ReadonlyArray<{ fileId: string; fileName: string }>; zipName: string }) {
  const client = useMediaClient();
  const [state, setState] = useState<null | { done: number }>(null);
  const run = async () => {
    setState({ done: 0 });
    const names = zipEntryNames(items.map((i) => i.fileName));
    const missed: string[] = [];
    try {
      const { BlobReader, BlobWriter, ZipWriter } = await import("@zip.js/zip.js");
      const zip = new ZipWriter(new BlobWriter("application/zip"), { level: 0 });
      for (const [i, item] of items.entries()) {
        try {
          const handle = await client.getBlob({ file_id: item.fileId, mime_type: "video/mp4" });
          const blob = await (await fetch(handle.url)).blob();
          await zip.add(names[i] ?? item.fileName, new BlobReader(blob));
        } catch {
          missed.push(names[i] ?? item.fileName);
        }
        setState({ done: i + 1 });
      }
      const out = await zip.close();
      if (missed.length === items.length) throw new Error("None of the videos could be read");
      downloadFile(zipName, out, "application/zip");
      if (missed.length) toast.error(`${missed.length} video${missed.length === 1 ? "" : "s"} could not be added: ${missed.slice(0, 3).join(", ")}${missed.length > 3 ? "…" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't make the zip");
    } finally {
      setState(null);
    }
  };
  return (
    <Button variant="outline" icon={<Download />} disabled={state !== null} onClick={() => void run()}>
      {state ? `Zipping ${state.done} of ${items.length}…` : `Download all ${items.length} as zip`}
    </Button>
  );
}

/** A failed run: its words on one line, with the Alchemy menu beside them. */
export function FailureLine({ error, operation }: { error: unknown; operation: string }) {
  const guard = useExpiredSessionGuard();
  useEffect(() => {
    guard(error);
  }, [error, guard]);
  const text = isSessionExpired(error) ? "Your sign-in ran out. Taking you to sign in." : plainFailureText(error);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="type-meta min-w-0 flex-1 text-destructive">{text.slice(0, 220)}</span>
      <ErrorAlchemyMenu error={error} operation={operation} />
    </div>
  );
}

/** A button that opens the file chooser; the chosen files go to `onFiles`. */
export function FilePickButton({
  accept,
  multiple,
  icon,
  disabled,
  onFiles,
  children,
}: {
  accept: string;
  multiple?: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  children: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="outline" icon={icon} disabled={disabled} onClick={() => input.current?.click()}>
        {children}
      </Button>
    </>
  );
}
