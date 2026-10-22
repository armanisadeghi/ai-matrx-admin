"use client";

import { Suspense, useMemo } from "react";
import { MatrxMiniLoader } from "@ai-matrx/design-system";
import { isMaterializedArtifactId } from "@ai-matrx/kit/artifact-id";
import { useCanvasItem } from "@/features/canvas/hooks/useCanvasItem";
import StructuredPlanBlock from "@/components/mardown-display/blocks/plan/StructuredPlanBlock";
import { kindServerDataFromStoredValue } from "@ai-matrx/rich-content/kinds/react/kind-route";
import { storedKindValue } from "../storedKindValue";
import type { ArtifactRendererProps } from "../types";

/**
 * The text StructuredPlanBlock draws. A `structured_info` kind value arrives as
 * JSON (`raw`, or an object/JSON-string `data` on a saved row); the kind's
 * bridge projects it to the viewer's markdown in `serverData.content`. That
 * projection wins — drawing `raw` put the JSON on screen as "0 sections"
 * (Agent Studio, agent 996a6bfc, 2026-10-19). Plain fence markdown has no
 * bridge output and draws as itself.
 */
export function structuredInfoText(
  serverData: unknown,
  data: unknown,
  raw: string | undefined,
): string | undefined {
  const projected = projectedContent(serverData);
  if (projected !== undefined) return projected;
  const stored = data ?? raw;
  const fromValue = projectedContent(
    kindServerDataFromStoredValue(storedKindValue(stored)),
  );
  if (fromValue !== undefined) return fromValue;
  return typeof data === "string" ? data : raw;
}

function projectedContent(serverData: unknown): string | undefined {
  const content = (serverData as { content?: unknown } | null | undefined)
    ?.content;
  return typeof content === "string" && content !== "" ? content : undefined;
}
/**
 * Unified renderer for `structured_info` artifacts (transcription + tasks
 * combined). Durable structured content → materializes (persisted, versioned,
 * render-by-id). Renders the existing StructuredPlanBlock viewer. Edit mode +
 * domain sync are the next adapter layer — see FEATURE.md.
 */
export default function StructuredInfoArtifact({
  raw,
  data,
  serverData,
  artifactId,
}: ArtifactRendererProps) {
  const content = structuredInfoText(serverData, data, raw);
  const materialized = isMaterializedArtifactId(artifactId);

  // Only bail on empty content HERE — the materialized path below self-loads
  // its markdown from the canvas row (via `useCanvasItem`), so it must not be
  // gated on a `content`/`raw` prop the canvas never passes (canvas opens with
  // `data: { artifactId }`, no raw string). Bailing early was why an opened
  // canvas panel for a materialized structured-info artifact rendered blank
  // (FOUND_DEFECTS D49 — same class as the table fix).
  if (!materialized) {
    if (!content) return null;
    return (
      <Suspense fallback={<MatrxMiniLoader />}>
        <StructuredPlanBlock content={content} />
      </Suspense>
    );
  }

  return (
    <StructuredInfoArtifactMaterialized
      canvasItemId={artifactId as string}
      fallbackContent={content ?? ""}
    />
  );
}

/**
 * Materialized wrapper — self-loads the markdown from the persisted canvas
 * row (mirrors `TableArtifactMaterialized`'s row-backed `content` useMemo),
 * since `StructuredPlanBlock` takes `content` as a required string prop and
 * has no row-awareness of its own.
 */
function StructuredInfoArtifactMaterialized({
  canvasItemId,
  fallbackContent,
}: {
  canvasItemId: string;
  fallbackContent: string;
}) {
  const { row, loading } = useCanvasItem(canvasItemId);

  const content = useMemo(() => {
    const stored = row?.content as
      { data?: unknown } | string | null | undefined;
    if (stored && typeof stored === "object" && "data" in stored) {
      // A structured row stores the `__kind` value object itself.
      return structuredInfoText(undefined, stored.data, undefined) ?? fallbackContent;
    }
    if (typeof stored === "string") {
      return structuredInfoText(undefined, stored, undefined) ?? fallbackContent;
    }
    return fallbackContent;
  }, [row, fallbackContent]);

  if (loading && !row) {
    return <MatrxMiniLoader />;
  }

  if (!content) return null;

  return (
    <Suspense fallback={<MatrxMiniLoader />}>
      <StructuredPlanBlock content={content} />
    </Suspense>
  );
}
