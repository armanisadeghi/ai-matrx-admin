"use client";

/**
 * ShapeInspectPanel — measured feedback for a shape's rendering (legible-diagrams L7b).
 *
 * "Inspect" runs Alchemy's inspect on the rendered shape (its screenshot and the
 * `@ai-matrx/diagrams/measure` numbers), shows the problem count and offers
 * Copy for AI with the instance and the component source. "Latest inspection" lists
 * the newest saved server-side captures (`content_ir.render_inspection`) with their
 * screenshots. Reuses InspectButton, measure and MediaThumbnail; renders nothing itself.
 */

import { useMemo, type RefObject } from "react";
import { InspectButton } from "@ai-matrx/alchemy/react/inspect";
import { measure } from "@ai-matrx/diagrams/measure";
import { MediaThumbnail } from "@ai-matrx/media/react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

import { cn } from "@/lib/utils";
import { useShapeInspection } from "./useShapeInspection";
import type { InspectionCapture, LatestInspection } from "./latest-inspection";

interface ShapeInspectPanelProps {
  kind: string;
  label: string;
  kindDefinitionId: string;
  /** The wrapper around the rendered shape — what gets measured and captured. */
  targetRef: RefObject<Element | null>;
  /** The instance on screen (null = nothing rendered yet). Rides Copy for AI. */
  payload: unknown;
  /** Where the picture was taken, for the AI envelope. */
  location: string;
  className?: string;
}

export default function ShapeInspectPanel({
  kind,
  label,
  kindDefinitionId,
  targetRef,
  payload,
  location,
  className,
}: ShapeInspectPanelProps) {
  const inspection = useShapeInspection(kindDefinitionId);
  const source = inspection.data?.component?.source ?? undefined;
  const sourceKey = inspection.data?.component?.key;
  const subject = useMemo(
    () => () => ({
      title: `the ${label} shape (${kind})${sourceKey ? `, component ${sourceKey}` : ""}`,
      payload,
      ...(source ? { source, sourceLanguage: "tsx" } : {}),
    }),
    [kind, label, payload, source, sourceKey],
  );

  return (
    <div className={cn("space-y-2 rounded-md border border-border bg-card p-2", className)} data-testid="shape-inspect-panel">
      <div className="flex items-center gap-2">
        <InspectButton
          target={targetRef}
          measure={measure}
          subject={subject}
          location={location}
        />
      </div>
      <LatestInspectionSection
        loading={inspection.isPending}
        error={inspection.isError ? inspection.error.message : null}
        hasComponent={inspection.data ? inspection.data.component !== null : true}
        latest={inspection.data?.latest ?? null}
        onRetry={() => void inspection.refetch()}
      />
    </div>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function LatestInspectionSection({
  loading,
  error,
  hasComponent,
  latest,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  hasComponent: boolean;
  latest: LatestInspection | null;
  onRetry: () => void;
}) {
  return (
    <section aria-label="Latest inspection" className="border-t border-border pt-2">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">Latest inspection</span>
        {latest ? (
          <span className="text-xs text-muted-foreground">
            Round {latest.round} · {plural(latest.problems, "problem", "problems")}
            {latest.failed > 0 ? ` · ${latest.failed} not captured` : ""}
          </span>
        ) : null}
      </div>
      {loading ? (
        <RegionSkeleton shape="rows" count={2} aria-label="Loading the latest inspection" />
      ) : error ? (
        <ErrorNotice
          size="compact"
          title="Couldn’t read the latest inspection"
          message={error}
          operation="read the latest shape inspection"
          onRetry={onRetry}
        />
      ) : !hasComponent ? (
        <p className="text-xs text-muted-foreground">No web component registered</p>
      ) : !latest ? (
        <p className="text-xs text-muted-foreground">Not inspected yet</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {latest.captures.map((capture) => (
            <CaptureCard key={`${capture.rowId}:${capture.where}`} capture={capture} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CaptureCard({ capture }: { capture: InspectionCapture }) {
  const status =
    capture.problems === null
      ? "Not captured"
      : capture.problems === 0
        ? "No problems"
        : plural(capture.problems, "problem", "problems");
  return (
    <li className="min-w-0 rounded-md border border-border bg-background p-1.5" data-capture={capture.where}>
      {capture.screenshotFileId ? (
        <a
          href={`/files/f/${capture.screenshotFileId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the ${capture.where} screenshot`}
          className="block"
        >
          <MediaThumbnail
            mediaRef={{ file_id: capture.screenshotFileId, mime_type: "image/png" }}
            fileName={`${capture.where} screenshot`}
            mimeType="image/png"
            iconSize={20}
            className="aspect-[4/3] w-full"
          />
        </a>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded bg-muted/40 text-xs text-muted-foreground">
          No screenshot
        </div>
      )}
      <div className="mt-1 flex items-center gap-1 text-xs">
        <span className="font-medium text-foreground">{capture.where}</span>
        <span className={capture.problems ? "font-medium text-foreground" : "text-muted-foreground"}>{status}</span>
      </div>
      {capture.error ? (
        <ErrorNotice size="inline" message={capture.error} operation="capture the shape for inspection" />
      ) : null}
    </li>
  );
}
