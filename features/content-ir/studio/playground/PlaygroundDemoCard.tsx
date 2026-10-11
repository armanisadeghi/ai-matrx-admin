"use client";

import React from "react";
import { Play, RotateCcw } from "lucide-react";
import { Badge, SegmentedControl, type BadgeTone } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DbKindComponent } from "@/features/content-ir/react/db-component/DbKindComponent";
import type { KindSandboxSettings } from "@/features/content-ir/react/db-component/useKindSandboxKnob";
import { BlockStateHost } from "@/features/block-state/BlockStateContext";
import { useBlockState } from "@/features/block-state/useBlockState";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type CapturedError,
} from "@/lib/diagnostics/errorCaptureStore";
import type { PlaygroundDemo } from "./types";
import { demoResolution } from "./demo-resolution";
import { streamFrames, partialFrame } from "./stream-frames";
import { judgeDemo, imageProbe, type CheckStatus, type DemoProbe } from "./demo-health";
import { useDemoItemHost } from "./useDemoItemHost";

export type RenderMode = "frame" | "page";
type WidthMode = "phone" | "panel" | "full";
type DataMode = "full" | "partial" | "empty";

const WIDTH_CLASS: Record<WidthMode, string> = {
  phone: "max-w-[375px]",
  panel: "max-w-[560px]",
  full: "max-w-none",
};

const STREAM_TICK_MS = 90;

export const VERDICT_TONE: Record<CheckStatus, BadgeTone> = {
  pass: "success",
  fail: "destructive",
  pending: "neutral",
  na: "neutral",
};

export const VERDICT_LABEL: Record<CheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  pending: "Checking",
  na: "n/a",
};

function errorMentions(entry: CapturedError, slug: string): boolean {
  if (entry.message.includes(slug)) return true;
  if (entry.relation?.includes(slug)) return true;
  const raw = entry.raw as { kind?: unknown } | undefined;
  return raw?.kind === slug;
}

/** Resets every key the item has saved (null deletes). */
function ResetItemState({ nonce }: { nonce: number }) {
  const { state, patch } = useBlockState({ title: null });
  const last = React.useRef(nonce);
  React.useEffect(() => {
    if (nonce === last.current) return;
    last.current = nonce;
    const keys = Object.keys((state as Record<string, unknown> | null) ?? {});
    if (keys.length) patch(Object.fromEntries(keys.map((key) => [key, null])));
  }, [nonce, state, patch]);
  return null;
}

function probeBox(host: HTMLElement, mode: RenderMode): Omit<DemoProbe, "errors" | "ageMs"> {
  const frame = host.querySelector("iframe");
  if (mode === "frame" && frame) {
    // A frame that never spoke shows its placeholder height — that is not a render.
    const heard = frame.getAttribute("data-matrx-kind-sandbox-heard") === "true";
    return { height: heard ? frame.getBoundingClientRect().height : 0, standIns: null, images: null };
  }
  const shell = host.firstElementChild as HTMLElement | null;
  const height = shell ? shell.getBoundingClientRect().height - 8 : 0;
  const hostRect = host.getBoundingClientRect();
  const images = { total: 0, broken: 0, cropped: 0 };
  host.querySelectorAll("img").forEach((img) => {
    const box = img.getBoundingClientRect();
    let left = box.left;
    let top = box.top;
    let right = box.right;
    let bottom = box.bottom;
    for (let el = img.parentElement; el && el !== host; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const r = el.getBoundingClientRect();
        left = Math.max(left, r.left);
        top = Math.max(top, r.top);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    right = Math.min(right, hostRect.right);
    const verdict = imageProbe(
      img,
      { width: box.width, height: box.height },
      getComputedStyle(img).objectFit,
      { width: Math.max(0, right - left), height: Math.max(0, bottom - top) },
    );
    if (verdict === "loading") return;
    images.total += 1;
    if (verdict === "broken") images.broken += 1;
    if (verdict === "cropped") images.cropped += 1;
  });
  return { height, standIns: host.querySelectorAll("[data-unresolved-import]").length, images };
}

export interface PlaygroundDemoCardProps {
  demo: PlaygroundDemo;
  mode: RenderMode;
  /** The frame decision the page resolved (null = the frame's ceiling did not resolve). */
  frameSandbox: KindSandboxSettings | null;
  frameRefusal: string | null;
  onVerdict: (slug: string, verdict: CheckStatus) => void;
}

export function PlaygroundDemoCard({ demo, mode: pageMode, frameSandbox, frameRefusal, onVerdict }: PlaygroundDemoCardProps) {
  const [mode, setMode] = React.useState<RenderMode>(pageMode);
  React.useEffect(() => setMode(pageMode), [pageMode]);
  const [width, setWidth] = React.useState<WidthMode>("full");
  const [dataMode, setDataMode] = React.useState<DataMode>("full");
  const [frames, setFrames] = React.useState<Record<string, unknown>[] | null>(null);
  const [tick, setTick] = React.useState(0);
  const [mountedAt, setMountedAt] = React.useState(() => Date.now());
  const [resetNonce, setResetNonce] = React.useState(0);
  const host = useDemoItemHost(demo);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  // Replay: walk the frames, then hold on the last one.
  React.useEffect(() => {
    if (!frames) return undefined;
    if (tick >= frames.length - 1) {
      setFrames(null);
      return undefined;
    }
    const timer = window.setTimeout(() => setTick((t) => t + 1), STREAM_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [frames, tick]);

  const value = frames
    ? frames[Math.min(tick, frames.length - 1)]
    : dataMode === "full"
      ? demo.sample
      : dataMode === "partial"
        ? partialFrame(demo.sample)
        : {};
  const content = JSON.stringify({ __kind: demo.slug, ...value });
  const resolution = demoResolution(demo);
  const sandbox: KindSandboxSettings | null =
    mode === "frame" ? frameSandbox : { enabled: false, ceilings: null, refusal: null };

  const restart = () => setMountedAt(Date.now());

  // The live test.
  const captured = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const errors = captured
    .filter((entry) => entry.lastAt >= mountedAt && errorMentions(entry, demo.slug))
    .map((entry) => entry.message);
  const [box, setBox] = React.useState<Omit<DemoProbe, "errors" | "ageMs">>({ height: null, standIns: null, images: null });
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const measure = () => {
      if (hostRef.current) setBox(probeBox(hostRef.current, mode));
      setNow(Date.now());
    };
    measure();
    const timer = window.setInterval(measure, 750);
    return () => window.clearInterval(timer);
  }, [mode]);
  const { checks, verdict } = judgeDemo({ ...box, errors, ageMs: now - mountedAt });
  React.useEffect(() => onVerdict(demo.slug, verdict), [onVerdict, demo.slug, verdict]);

  const frameBlocked = mode === "frame" && !frameSandbox;
  const shape = frameBlocked ? (
    frameRefusal ? (
      <p className="p-2 text-xs text-destructive">{frameRefusal}</p>
    ) : (
      <p className="p-2 text-xs text-muted-foreground">Loading frame setting</p>
    )
  ) : (
    <DbKindComponent
      key={`${mode}-${mountedAt}`}
      content={content}
      resolution={resolution}
      sandbox={sandbox}
    />
  );

  return (
    <section
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
      data-playground-demo={demo.slug}
      data-verdict={verdict}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{demo.title}</h2>
        <Badge tone={VERDICT_TONE[verdict]}>{VERDICT_LABEL[verdict]}</Badge>
        <div className="flex flex-wrap gap-1">
          {demo.covers.map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<RenderMode>
          aria-label="Render"
          value={mode}
          onValueChange={(next) => {
            setMode(next);
            restart();
          }}
          data={[
            { value: "frame", label: "Frame" },
            { value: "page", label: "In page" },
          ]}
        />
        <SegmentedControl<WidthMode>
          aria-label="Width"
          value={width}
          onValueChange={setWidth}
          data={[
            { value: "phone", label: "Phone" },
            { value: "panel", label: "Panel" },
            { value: "full", label: "Full" },
          ]}
        />
        <SegmentedControl<DataMode>
          aria-label="Data"
          value={dataMode}
          onValueChange={(next) => {
            setDataMode(next);
            setFrames(null);
          }}
          data={[
            { value: "full", label: "Full" },
            { value: "partial", label: "Partial" },
            { value: "empty", label: "Empty" },
          ]}
        />
        <Button
          variant="outline"
          icon={<Play className="h-4 w-4" />}
          disabled={frames !== null}
          onClick={() => {
            setDataMode("full");
            setTick(0);
            setFrames(streamFrames(demo.sample));
          }}
        >
          {frames ? "Streaming" : "Replay"}
        </Button>
        {demo.savesItemState ? (
          <Button
            variant="quiet"
            icon={<RotateCcw className="h-4 w-4" />}
            disabled={!host.canvasItemId}
            onClick={() => setResetNonce((n) => n + 1)}
          >
            Reset state
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {checks.map((check) => (
          <span key={check.id} title={check.detail ?? undefined}>
            <Badge tone={VERDICT_TONE[check.status]}>
              {check.label}: {VERDICT_LABEL[check.status]}
            </Badge>
          </span>
        ))}
        {host.error ? <Badge tone="destructive">Item: {host.error}</Badge> : null}
      </div>
      {errors.length ? (
        <p className="break-words font-mono text-[11px] text-destructive">{errors[0]}</p>
      ) : null}
      <div ref={hostRef} className={cn("w-full rounded-md border border-dashed border-border bg-background", WIDTH_CLASS[width])}>
        {host.canvasItemId ? (
          <BlockStateHost kind={demo.slug} canvasItemId={host.canvasItemId}>
            <ResetItemState nonce={resetNonce} />
            {shape}
          </BlockStateHost>
        ) : (
          shape
        )}
      </div>
    </section>
  );
}
