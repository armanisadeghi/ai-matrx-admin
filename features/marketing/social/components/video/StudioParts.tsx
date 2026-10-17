"use client";

/**
 * Pieces the clone page and the project studio share: the live run log (shimmer on the step that is running),
 * the cost line (points with dollars to the cent beside), caption-look tiles drawn from the engine's real
 * CAPTION_PRESETS, the composition preview (the engine's resolver + VideoPlayer) and an output download row.
 */

import { useEffect, useState } from "react";
import { Check, CircleAlert, Download, Film } from "lucide-react";

import type { Composition } from "@ai-matrx/media/video";
import { resolveComposition } from "@ai-matrx/media/video";
import { CAPTION_PRESETS, CAPTION_PRESET_IDS, loadVideoFonts, programInputFromComposition } from "@ai-matrx/media/video/engine";
import { VideoPlayer } from "@ai-matrx/media/video/react";
import { Badge, Button, EmptyState } from "@ai-matrx/design-system/controls";
import { downloadUrl } from "@ai-matrx/kit/download";

import { ShimmerText } from "@/components/loaders/ShimmerText";
import { cn } from "@/lib/utils";

import { dollars, points } from "../../video/clone";
import { useFileUrls } from "../../video/studio-hooks";

// ── run log ─────────────────────────────────────────────────────────────────────────────────────────

export interface RunStep {
  id: string;
  label: string;
  state: "running" | "done" | "failed";
  meta?: string;
}

/** Steps of a running job, newest last; the running step shimmers. */
export function RunLog({ steps, className }: { steps: RunStep[]; className?: string }) {
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
          {s.meta ? <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{s.meta}</span> : null}
        </li>
      ))}
    </ol>
  );
}

/** Push a step: the previous running step is marked done. */
export function pushStep(steps: RunStep[], step: RunStep): RunStep[] {
  const closed = steps.map((s) => (s.state === "running" ? { ...s, state: "done" as const } : s));
  const at = closed.findIndex((s) => s.id === step.id);
  if (at >= 0) {
    const next = [...closed];
    next[at] = step;
    return next;
  }
  return [...closed, step];
}

export function closeSteps(steps: RunStep[], state: "done" | "failed" = "done"): RunStep[] {
  return steps.map((s) => (s.state === "running" ? { ...s, state } : s));
}

// ── cost ────────────────────────────────────────────────────────────────────────────────────────────

export function CostLine({ usd, pts, label }: { usd: number | null | undefined; pts: number | null | undefined; label?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 tabular-nums">
      {label ? <span className="type-meta text-muted-foreground">{label}</span> : null}
      <span className="type-label text-foreground">{points(pts)}</span>
      <span className="type-meta text-muted-foreground">{dollars(usd)}</span>
    </span>
  );
}

// ── caption looks ───────────────────────────────────────────────────────────────────────────────────

/** Content colour (the dark video frame captions sit on), not interface chrome. */
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

/** One caption look drawn from the preset itself (font, case, colours, outline, active-word style). */
function CaptionSample({ presetId }: { presetId: string }) {
  const p = CAPTION_PRESETS[presetId];
  if (!p) return null;
  const words = ["this", "changes", "everything"];
  const stroke = p.strokeWidthPx > 0 ? `${Math.max(1, p.strokeWidthPx / 6)}px ${p.strokeColor}` : undefined;
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

export function CaptionLookPicker({
  value,
  onChange,
  disabled,
  extra,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Leading choices that are not presets (e.g. "Match the reference", "No captions"). */
  extra?: ReadonlyArray<{ id: string; label: string }>;
}) {
  useVideoFonts();
  return (
    <div role="radiogroup" aria-label="Caption look" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4">
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
            "flex h-20 flex-col overflow-hidden rounded-lg border",
            value === id ? "border-primary ring-1 ring-primary" : "border-border",
          )}
        >
          {/* A video frame stand-in: captions are drawn over footage, so the tile is a fixed dark frame in both themes. */}
          <span className="flex flex-1 items-center justify-center" style={{ background: VIDEO_FRAME_BG }}>
            <CaptionSample presetId={id} />
          </span>
          <span className="type-meta truncate bg-card px-1 py-0.5 text-foreground">{CAPTION_PRESETS[id]?.label ?? id}</span>
        </button>
      ))}
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
export function CompositionPreview({ doc, className }: { doc: Composition; className?: string }) {
  const byMedia = mediaFileIds(doc);
  const { facts, pending } = useFileUrls(Object.values(byMedia));
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
  if (pending) {
    return <div className={cn("animate-pulse rounded-lg bg-muted", className)} style={{ aspectRatio: ratio }} aria-label="Loading preview" />;
  }
  return (
    <div className={className}>
      <VideoPlayer input={programInputFromComposition(doc, resolved.timeline)} mediaUrls={mediaUrls} hideTranscript />
    </div>
  );
}

// ── outputs ─────────────────────────────────────────────────────────────────────────────────────────

export function OutputDownload({ fileId, label }: { fileId: string; label: string }) {
  const { facts } = useFileUrls([fileId]);
  const f = facts[fileId];
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge tone="success">mp4</Badge>
      <span className="type-label truncate text-foreground">{label}</span>
      <Button
        variant="outline"
        icon={<Download />}
        className="ml-auto"
        disabled={!f?.url || busy}
        onClick={() => {
          if (!f?.url) return;
          setBusy(true);
          downloadUrl(f.url, f.name ?? `${label}.mp4`, { newTab: true });
          setBusy(false);
        }}
      >
        Download
      </Button>
    </div>
  );
}
