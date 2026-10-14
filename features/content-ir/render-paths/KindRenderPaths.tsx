"use client";

/**
 * THE HONEST PREVIEW — one example, rendered through every real path.
 *
 * 🚨 Arman, 2026-08-29: "You should never cheat when showing a preview or an
 * example… make sure the rendering is through the same exact fucking path as
 * everywhere else it's used. And if it's rendered in multiple ways in
 * different places, then show multiple rendering tabs so you see it as it's
 * going to be in every single situation."
 *
 * What this replaces: a Preview that handed the stored example straight to the
 * component as a JavaScript object. No text, no recognition, no routing — so
 * it could not fail the way production fails, and on 2026-08-29 it showed a
 * flawless `electronics_intake_analysis` while that kind was rendering as a
 * key/value dump in every chat.
 *
 * Every mode here drives the production classes, and each one states what it
 * genuinely exercises (`RenderPathSpec.exercises`) — including where an input
 * is synthesized rather than live. The verdict strip reports what the ROUTE
 * returned, not whether a component row exists, because "a row exists" is the
 * question that let every broken kind report healthy.
 */

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { SafeBlockRenderer } from "@ai-matrx/rich-content/display/chat-markdown/internal-handlers/SafeBlockRenderer";
import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";
import KindInputForm from "@/features/content-ir/input/KindInputForm";
import { resolveLoadingSlugForKind } from "@ai-matrx/rich-content/kinds/react/loading/resolve-loading-slug";
import { resolveKindLoadingComponent } from "@ai-matrx/rich-content/kinds/react/loading/kind-loading-registry";
import { useContentIrKindVersion } from "@ai-matrx/rich-content/kinds/react/use-registry-repaint";
import { useEnsureKindRenderable } from "@ai-matrx/rich-content/kinds/react/ensure-kind-renderable";
import { enterKindRenderHarness } from "@/features/content-ir/react/db-component/kindComponentIncident";
import { RENDER_PATHS, type RenderPathId, type RenderPathSpec } from "./paths";
import { readKindSchemaState, runRenderPath } from "./run-path";
import { useBoundedKindCheck } from "./use-bounded-kind-check";
import { Button } from "@ai-matrx/design-system/controls";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import {
  describeRenderVerdict,
  readSharedResolution,
  readViewerLayerScope,
  readViewerViewKey,
  sharedHasComponent,
  useRegistryVersion,
  useSharedViewState,
} from "@/features/content-ir/studio/shared-view-truth";

const noop = () => {};

export interface KindRenderPathsProps {
  kind: string;
  /** The instance to render — a canonical example, or anything the host holds. */
  value: Record<string, unknown>;
  /** Start on a specific path (deep links / remembered choice). */
  initialPath?: RenderPathId;
}

/**
 * The one line that matters: did the kind's own component render?
 *
 * Deliberately blunt. A green here means the route returned the component; a
 * red means the reader got the generic key/value floor, and the reason says
 * which repair it needs.
 */
function VerdictStrip({
  reached,
  resolvedAs,
  kindState,
  fallbackReason,
  notes,
  headline,
  debug,
}: {
  /** Admin debugging only: the route's block type, state and fallback code. */
  debug: boolean;
  headline: string;
  reached: boolean;
  resolvedAs: string;
  kindState: string | null;
  fallbackReason: string | null;
  notes: string[];
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${
        reached
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {reached ? (
          <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CircleX className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <span className="font-medium text-foreground">
          {headline}
        </span>
        {debug && (
        <span className="ml-auto flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5 font-mono">
            {resolvedAs}
          </code>
          {kindState && (
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {kindState}
            </code>
          )}
          {fallbackReason && (
            <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-amber-700 dark:text-amber-300">
              {fallbackReason}
            </code>
          )}
        </span>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 pl-6 text-muted-foreground">
          {notes.map((n) => (
            <li key={n} className="list-disc">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PathNote({ spec, debug }: { spec: RenderPathSpec; debug: boolean }) {
  return (
    <div className="space-y-1 rounded-md border border-border bg-card px-3 py-2 text-xs">
      <p className="text-foreground">{spec.where}</p>
      {/* How the check works is the maintainers' business: admin debugging only. */}
      {debug && (
        <p className="flex gap-1.5 text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{spec.exercises}</span>
        </p>
      )}
    </div>
  );
}

export default function KindRenderPaths({
  kind,
  value,
  initialPath = "chat_bare",
}: KindRenderPathsProps) {
  const [pathId, setPathId] = useState<RenderPathId>(initialPath);
  const debug = useAppSelector(selectIsAdminDebugger);
  // THE PREVIEW ASKS FOR WHAT IT JUDGES (defect 2026-10-14). The schema is
  // fetched lazily per kind, and this screen used to read it synchronously on
  // first paint and subscribe only to the COMPONENT registry — so a shape with
  // a good schema read "no loaded schema" and every streaming path reported
  // `unverified` until a tab switch remounted it. It now demands the schema +
  // component itself and repaints on THIS kind's arrivals in either registry.
  useEnsureKindRenderable(kind);
  // A harness, not a reader: generic frames here never file a sighting.
  useEffect(() => enterKindRenderHarness(), []);
  const kindVersion = useContentIrKindVersion(kind);
  const registryVersion = useRegistryVersion() + kindVersion;
  const spec = useMemo(
    () => RENDER_PATHS.find((p) => p.id === pathId) ?? RENDER_PATHS[0]!,
    [pathId],
  );

  // Re-run whenever the path, the kind, or the value changes. The registries
  // are consulted inside, so a component authored moments ago is reflected.
  const run = useMemo(
    // The registry version is an ARGUMENT, not only a dep: React Compiler infers
    // a memo's deps from what the callback reads and drops a manual dep it never
    // sees, so a view landing after first paint (the viewer's overlay) would
    // keep the first, stale verdict and blocks (defect, 2026-10-14).
    () => runRenderPath(pathId, kind, value, undefined, registryVersion),
    [pathId, kind, value, registryVersion],
  );

  // The headline names the SHARED truth: a viewer's own layered view rendering
  // is not "this shape's own component".
  const sharedComponent = sharedHasComponent(readSharedResolution(kind, registryVersion));
  const layerScope = readViewerLayerScope(kind, registryVersion);
  const viewKey = readViewerViewKey(kind, registryVersion);

  const loading = resolveLoadingSlugForKind(kind);
  const LoadingComponent = resolveKindLoadingComponent(loading.slug);
  // Measured, never assumed: "pending" until the read settles.
  const schemaState = readKindSchemaState(kind, registryVersion);
  // The component list must have landed too, or the verdict would name the
  // generic floor for a kind whose component is still on its way.
  const componentsChecked = useSharedViewState(kind) !== "checking";
  const settled = schemaState !== "pending" && componentsChecked;
  const check = useBoundedKindCheck(kind, settled);

  return (
    <div className="space-y-3">
      {/* Mode selector — one entry per real path. */}
      <div className="flex flex-wrap gap-1">
        {RENDER_PATHS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPathId(p.id)}
            className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
              p.id === pathId
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <PathNote spec={spec} debug={debug} />

      {schemaState === "absent" && (
        <div className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This shape has no loaded schema, so nothing can check a payload
            against it. That is a defect in the shape, not in the payload — the
            streaming paths below will report <code>unverified</code>.
          </span>
        </div>
      )}

      {schemaState === "failed" && (
        <div className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This shape&apos;s schema could not be read, so the verdict below is
            not checked against it.
          </span>
        </div>
      )}

      {run && !settled && !check.timedOut && (
        <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          Checking this shape…
        </div>
      )}

      {run && !settled && check.timedOut && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Couldn&apos;t check this shape — no answer yet.</span>
          <Button variant="quiet" onClick={check.retry}>
            Try again
          </Button>
        </div>
      )}

      {run && settled && (
        <VerdictStrip
          debug={debug}
          headline={describeRenderVerdict({
            reached: run.verdict.reachedRealComponent,
            sharedHasComponent: sharedComponent,
            layerScope,
          })}
          reached={run.verdict.reachedRealComponent}
          resolvedAs={run.verdict.resolvedAs}
          kindState={run.verdict.kindState}
          fallbackReason={run.verdict.fallbackReason}
          notes={run.verdict.notes}
        />
      )}

      {/* The render itself. Block paths go through the production renderer,
          which routes each block ITSELF — the verdict above describes that
          same decision rather than substituting for it. */}
      <div className="rounded-md border border-border bg-card p-3">
        {run ? (
          run.blocks.map((block, index) => (
            <SafeBlockRenderer
              key={`${block.blockId}:${viewKey}`}
              block={{
                type: block.type,
                content: block.content ?? "",
                serverData: block.data ?? undefined,
                metadata: block.metadata,
                isStreamingBlock: block.status === "streaming",
              }}
              index={index}
              isStreamActive={false}
              replaceBlockContent={noop}
              handleOpenEditor={noop}
            />
          ))
        ) : pathId === "direct" ? (
          <KindInstanceRender kind={kind} value={value} />
        ) : pathId === "loading" ? (
          <div className="space-y-2">
            {debug && (
              <p className="text-[11px] text-muted-foreground">
                slug <code className="font-mono">{loading.slug ?? "generic"}</code>{" "}
                ({loading.origin}
                {loading.invalidDeclared
                  ? ` — the row declares "${loading.invalidDeclared}", which is not a library slug`
                  : ""}
                )
              </p>
            )}
            <LoadingComponent />
          </div>
        ) : pathId === "input" ? (
          <KindInputForm kind={kind} onSubmit={async () => {}} />
        ) : null}
      </div>
    </div>
  );
}
