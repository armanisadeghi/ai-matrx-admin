"use client";

/**
 * /shape-preview — ONE stored shape component, rendered through the real path and judged by the
 * Shape Playground's own check, for the headless browser that screenshots it for the authoring agent
 * (aidream `kindcomp_preview`, services/kind_preview).
 *
 * No session: the signed `t` token is the whole credential; the render bundle comes from aidream's
 * anonymous `GET /public/kind-components/preview/{token}`. The verdict is published on
 * `window.__MATRX_SHAPE_PREVIEW__` (`done: true` once settled) — the browser's measure script awaits it
 * before taking the screenshot.
 */
import React from "react";
import { useSearchParams } from "next/navigation";
import type { ComponentResolution } from "@ai-matrx/content-ir/react";
import { DbKindComponent } from "@/features/content-ir/react/db-component/DbKindComponent";
import type { KindSandboxSettings } from "@/features/content-ir/react/db-component/useKindSandboxKnob";
import {
  KindDrawReportHost,
  useKindDrawCollector,
} from "@/features/content-ir/react/db-component/kind-draw-report";
import { MAX_INBOUND_BYTES } from "@/features/content-ir/sandbox/protocol";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/diagnostics/errorCaptureStore";
import { resolveBaseUrl } from "@/lib/python-client";
import { judgeDemo, RENDER_GRACE_MS } from "../playground/demo-health";
import { errorMentions, overflowPx, probeBox, type RenderMode } from "../playground/demo-probe";
import { streamFrames } from "../playground/stream-frames";

interface PreviewBundle {
  kind: string;
  data: Record<string, unknown>;
  data_source: string;
  component: {
    component_id: string;
    component_key: string;
    source: string;
    component_source: string | null;
    props_transform: string | null;
    config: Record<string, unknown>;
    pinned_kind_version: number | null;
    is_active: boolean;
    updated_at: string | null;
    created_by: string | null;
  };
}

export interface ShapePreviewReport {
  done: boolean;
  stage: "loading" | "rendering" | "streaming" | "settled" | "error";
  kind?: string;
  verdict?: string;
  checks?: ReturnType<typeof judgeDemo>["checks"];
  drawState?: string;
  overflowPx?: number;
  theme?: string;
  error?: string;
}

declare global {
  interface Window {
    __MATRX_SHAPE_PREVIEW__?: ShapePreviewReport;
  }
}

const STREAM_TICK_MS = 90;
/** A verdict must hold this many probes in a row before it is final (images decode, fonts swap). */
const STABLE_PROBES = 3;
const PROBE_MS = 300;

function publish(report: ShapePreviewReport) {
  window.__MATRX_SHAPE_PREVIEW__ = report;
}

function toResolution(bundle: PreviewBundle): ComponentResolution {
  const c = bundle.component;
  return {
    componentKey: c.component_key,
    source: "db",
    config: c.config,
    isActive: c.is_active,
    resolvedBy: "db",
    componentSource: c.component_source,
    propsTransform: c.props_transform,
    hasComponentSource: Boolean(c.component_source),
    pinnedKindVersion: c.pinned_kind_version,
    updatedAt: c.updated_at ?? `preview-${c.component_id}`,
    createdBy: c.created_by,
  };
}

function useForcedTheme(theme: string) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
  }, [theme]);
}

function PreviewStage({ bundle, mode, stream, theme }: { bundle: PreviewBundle; mode: RenderMode; stream: boolean; theme: string }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [mountedAt] = React.useState(() => Date.now());
  const { __kind: _kind, ...body } = bundle.data;
  const [frames] = React.useState(() => (stream ? streamFrames(body) : null));
  const [tick, setTick] = React.useState(0);
  const streaming = frames !== null && tick < frames.length - 1;
  React.useEffect(() => {
    if (!streaming) return undefined;
    const timer = window.setTimeout(() => setTick((t) => t + 1), STREAM_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [streaming, tick]);
  const value = frames ? frames[Math.min(tick, frames.length - 1)] : body;
  const content = JSON.stringify({ __kind: bundle.kind, ...value });

  const sandbox: KindSandboxSettings =
    mode === "frame"
      ? { enabled: true, ceilings: { messageBytes: MAX_INBOUND_BYTES }, refusal: null }
      : { enabled: false, ceilings: null, refusal: null };
  const draw = useKindDrawCollector();
  const captured = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const errors = captured
    .filter((entry) => entry.lastAt >= mountedAt && errorMentions(entry, bundle.kind))
    .map((entry) => entry.message);
  const errorsRef = React.useRef(errors);
  errorsRef.current = errors;
  const drawRef = React.useRef(draw.state);
  drawRef.current = draw.state;
  const streamingRef = React.useRef(streaming);
  streamingRef.current = streaming;

  React.useEffect(() => {
    let last = "";
    let same = 0;
    const timer = window.setInterval(() => {
      const host = hostRef.current;
      if (!host) return;
      const ageMs = Date.now() - mountedAt;
      const { checks, verdict } = judgeDemo({ ...probeBox(host, mode), errors: errorsRef.current, ageMs });
      const drawState = drawRef.current;
      const report: ShapePreviewReport = {
        done: false,
        stage: streamingRef.current ? "streaming" : "rendering",
        kind: bundle.kind,
        verdict,
        checks,
        drawState,
        overflowPx: overflowPx(host),
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      };
      const key = JSON.stringify([verdict, checks, drawState]);
      same = key === last ? same + 1 : 0;
      last = key;
      const settled =
        !streamingRef.current &&
        verdict !== "pending" &&
        (drawState !== "waiting" || ageMs >= RENDER_GRACE_MS) &&
        same >= STABLE_PROBES - 1;
      publish(settled ? { ...report, done: true, stage: "settled" } : report);
      if (settled) window.clearInterval(timer);
    }, PROBE_MS);
    return () => window.clearInterval(timer);
  }, [bundle.kind, mode, mountedAt]);

  useForcedTheme(theme);

  return (
    <div ref={hostRef} data-shape-preview={bundle.kind} className="w-full bg-background">
      <KindDrawReportHost report={draw.report}>
        <DbKindComponent content={content} resolution={toResolution(bundle)} sandbox={sandbox} />
      </KindDrawReportHost>
    </div>
  );
}

export function ShapePreviewClient() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const mode: RenderMode = params.get("mode") === "frame" ? "frame" : "page";
  const stream = params.get("stream") === "1";
  const [bundle, setBundle] = React.useState<PreviewBundle | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  useForcedTheme(theme);

  React.useEffect(() => {
    publish({ done: false, stage: "loading" });
    if (!token) {
      setFailure("No preview token.");
      return;
    }
    let live = true;
    fetch(`${resolveBaseUrl()}/public/kind-components/preview/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as (PreviewBundle & { detail?: string }) | null;
        if (!res.ok || !body) throw new Error(body?.detail ?? `HTTP ${res.status}`);
        return body;
      })
      .then((b) => live && setBundle(b))
      .catch((e: unknown) => live && setFailure(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [token]);

  React.useEffect(() => {
    if (failure) publish({ done: true, stage: "error", error: `The preview could not load: ${failure}` });
  }, [failure]);

  if (failure) return <p className="p-4 text-sm text-destructive">{failure}</p>;
  if (!bundle) return null;
  return (
    <main className="min-h-dvh bg-background p-4 text-foreground">
      <PreviewStage bundle={bundle} mode={mode} stream={stream} theme={theme} />
    </main>
  );
}

export default ShapePreviewClient;
