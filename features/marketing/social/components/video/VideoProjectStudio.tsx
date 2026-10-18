"use client";

/**
 * Socials → Videos → one project. The live preview (the engine's VideoPlayer over the resolved head), the script
 * (click a word: fix the caption only, or change what is said), caption look and shape swaps, what is still to
 * make and its cost, Render (the project head through the batch door: generate what is missing, align, render),
 * the variants grid (three variants from a hook line / caption look / shape, run as one batch) and every finished
 * mp4 with Download. Every change is one patch through the project door with the version it was made against; a
 * stale write is refused and the page reloads the newer version.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Film, Layers, Music, Palette, Type } from "lucide-react";

import type { Composition, PatchOp, VariantOverride } from "@ai-matrx/media/video";
import { editWordOps, materializeVariant, setAspectOps } from "@ai-matrx/media/video";
import { CAPTION_PRESETS, CAPTION_PRESET_IDS } from "@ai-matrx/media/video/engine";
import { Badge, Button, EmptyState, Field, RegionSkeleton, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import {
  HEAD_ITEM,
  createVariantMatrix,
  dollars,
  points,
  streamBatch,
  streamGenerate,
  type CloneAspect,
  type LineEvent,
  type ParamSet,
} from "../../video/clone";
import { useProjectVariants, useVideoProject, videoKeys } from "../../video/hooks";
import { describeTheirs, rebasePending } from "../../video/conflict";
import { confirmLine, downloadName, estimateLabel, variantDownloadName, outputRows, perSecondLine, summarizeEstimate } from "../../video/estimate";
import { plainRenderMessage } from "../../video/render-errors";
import { cutText } from "../../video/text";
import { countWord, createButtonText, matrixOutcomeText, rebasedLabel, splitNewSets } from "../../video/variants";
import { BackendApiError } from "@ai-matrx/api";
import { appendPatch, conflictVersion, estimateProject, getVideoProject } from "../../video/server";
import { readCompositionHistory } from "../../video/service";
import { useLocalRenderAllowed } from "../../video/studio-hooks";
import type { VariantAnswer, VideoProjectAnswer } from "../../video/types";
import { useSocials } from "../SocialsContext";
import { CaptionLookPicker, CompositionPreview, CostLine, FailureLine, OutputDownload, RunLog, closeSteps, pendingMediaCount, pushStep, type RunStep } from "./StudioParts";
import { mediaLabel } from "./VideoCloneNew";
import { MusicPicker } from "./MusicPicker";
import { musicCostLine, musicOfDocument, musicOps, videoSecondsOf, type MusicChoice } from "../../video/music";
import { useQuery } from "@tanstack/react-query";

/** The timeline editor loads only when the person opens the Timeline view (heavy: the editor + its player). */
const TimelinePanel = dynamic(() => import("./TimelinePanel").then((m) => m.TimelinePanel), {
  ssr: false,
  loading: () => <RegionSkeleton shape="form" count={4} aria-label="Loading timeline" />,
});

const ASPECTS: ReadonlyArray<{ value: CloneAspect; label: string }> = [
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
];

type Renderer = "hosted" | "local";

interface ItemOutcome {
  status: string;
  stage?: string | null;
  error?: string | null;
  fileId?: string | null;
  usd?: number;
  pts?: number;
  /** The server said the cloud render itself is not billed. */
  renderFree?: boolean;
}

const EVENT = "video_variant_batch.";

/** Read the batch door's events into run steps + per-item outcomes. */
function batchHandler(
  setSteps: (fn: (prev: RunStep[]) => RunStep[]) => void,
  setOutcome: (fn: (prev: Record<string, ItemOutcome>) => Record<string, ItemOutcome>) => void,
  labelOf: (id: string) => string,
  flags: { confirm: boolean; error: string | null; failed: number },
) {
  return (e: LineEvent) => {
    const type = e.type.startsWith(EVENT) ? e.type.slice(EVENT.length) : e.type;
    const vid = typeof e.variant_id === "string" ? e.variant_id : "";
    switch (type) {
      case "variant.materialized":
        setOutcome((o) => ({ ...o, [vid]: { status: "ready" } }));
        break;
      case "estimated":
        setSteps((p) => pushStep(p, { id: "est", label: "Priced", state: "done", meta: points(Number(e.total_points ?? e.estimate_points)) }));
        break;
      case "confirmation_required":
        flags.confirm = true;
        break;
      case "generate.started":
        setSteps((p) => pushStep(p, { id: `gen-${vid}`, label: `Making media for ${labelOf(vid)}`, state: "running" }));
        break;
      case "generated":
        // Media is billed per picture or voice made; reused media costs nothing, and the line says so.
        setSteps((p) =>
          pushStep(p, { id: "gen", label: "Media ready", state: "done", meta: Number(e.total_usd) > 0 ? `Media ${dollars(Number(e.total_usd))}` : "Media · nothing new to pay" }),
        );
        break;
      case "aligned":
        setSteps((p) => pushStep(p, { id: "align", label: "Captions synced to the voice", state: "done" }));
        break;
      case "render.queued":
        setOutcome((o) => ({ ...o, [vid]: { ...o[vid], status: "queued" } }));
        break;
      case "render.started":
        setOutcome((o) => ({ ...o, [vid]: { ...o[vid], status: "rendering" } }));
        setSteps((p) => pushStep(p, { id: `render-${vid}`, label: `Rendering ${labelOf(vid)}`, state: "running" }));
        break;
      case "render.done": {
        const out = (e.output ?? {}) as { file_id?: string };
        const renderFree = e.render_charged === false;
        setOutcome((o) => ({ ...o, [vid]: { status: "rendered", fileId: out.file_id ?? null, usd: Number(e.cost_usd) || 0, pts: Number(e.points) || 0, renderFree } }));
        setSteps((p) =>
          p.map((s) => (s.id === `render-${vid}` ? { ...s, label: `${labelOf(vid)} rendered`, state: "done", meta: renderFree ? "Render · free" : dollars(Number(e.cost_usd)) } : s)),
        );
        break;
      }
      case "variant.failed": {
        // The server's typed code (or its person-readable message) becomes plain words; a cloud error never reaches the screen.
        const plain = plainRenderMessage(
          typeof e.code === "string" ? e.code : typeof e.error_code === "string" ? e.error_code : null,
          typeof e.user_message === "string" ? e.user_message : typeof e.error === "string" ? e.error : null,
        );
        flags.failed += 1;
        flags.error ??= plain;
        setOutcome((o) => ({ ...o, [vid]: { status: "failed", stage: String(e.stage ?? ""), error: plain } }));
        setSteps((p) => [...p, { id: `fail-${vid}-${p.length}`, label: `${labelOf(vid)} didn't render`, state: "failed" }]);
        break;
      }
      case "batch_report":
        // "Done" only when nothing failed; after a failure the line says what was spent, never that it finished.
        // The total is the media made; the render line above says whether the cloud render was billed.
        setSteps((p) => {
          const total = Number(e.total_usd);
          const paid = total > 0 ? `Media ${dollars(total)}` : "Nothing charged";
          const free = e.render_charged === false ? " · render free" : "";
          return pushStep(p, { id: "report", label: flags.failed > 0 || flags.error ? "Spent" : "Done", state: "done", meta: `${paid}${free}` });
        });
        break;
      case "error":
        flags.error = plainRenderMessage(
          typeof e.code === "string" ? e.code : null,
          typeof e.user_message === "string" ? e.user_message : typeof e.message === "string" ? e.message : null,
        );
        break;
      default:
        break;
    }
  };
}

export function VideoProjectStudio({ projectId }: { projectId: string }) {
  const project = useVideoProject(projectId);
  const { brandSeg, brandId } = useSocials();
  const router = useRouter();
  const base = `${marketingRoutes.brandSocials(brandSeg)}/videos`;
  // A project opened under another brand's address moves to its own brand (the address, not the video, was wrong).
  const ownBrand = project.data?.brand_ids[0];
  useEffect(() => {
    if (ownBrand && brandId && ownBrand !== brandId) router.replace(`${marketingRoutes.brandSocials(ownBrand)}/videos/${projectId}`);
  }, [ownBrand, brandId, projectId, router]);

  if (project.isPending) return <RegionSkeleton shape="form" count={6} aria-label="Loading video" />;
  if (project.isError) {
    const status = project.error instanceof BackendApiError ? project.error.status : null;
    if (status === 404 || status === 400 || status === 422) {
      return (
        <EmptyState
          icon={<Film />}
          title="This video doesn't exist"
          line="It may have been deleted, or the address is wrong"
          action={
            <Button asChild variant="primary">
              <Link href={base}>Back to Videos</Link>
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<Film />}
        title="Couldn't load this video"
        line={<ErrorAlchemyMenu error={project.error} operation="load video project" />}
        action={<Button onClick={() => void project.refetch()}>Retry</Button>}
      />
    );
  }
  const answer = project.data;
  const doc = answer.composition?.document as unknown as Composition | undefined;
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="quiet" icon={<ArrowLeft />}>
          <Link href={base}>Videos</Link>
        </Button>
        <span className="type-title truncate text-foreground">{answer.name}</span>
        <Badge>{`v${answer.head_version}`}</Badge>
      </div>
      {!doc ? (
        <EmptyState
          icon={<Clapperboard />}
          title="No plan yet"
          line="Plan the clone first"
          action={
            answer.reference_post_ids[0] ? (
              <Button asChild variant="primary">
                <Link href={`${base}/new?post=${answer.reference_post_ids[0]}&project=${projectId}`}>Plan the clone</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Studio answer={answer} doc={doc} />
      )}
    </div>
  );
}

function Studio({ answer, doc }: { answer: VideoProjectAnswer; doc: Composition }) {
  const { organizationId } = useSocials();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const projectId = answer.project_id;
  const head = answer.head_version;
  const [saving, setSaving] = useState(false);
  // The render fleet is the default everywhere; the local server is offered only in a dev build when the platform allows it.
  const localAllowed = useLocalRenderAllowed();
  const [pickedRenderer, setRenderer] = useState<Renderer>("hosted");
  const renderer: Renderer = localAllowed ? pickedRenderer : "hosted";
  const [conflict, setConflict] = useState<null | { ops: PatchOp[]; note: string; what: string; head: number; theirs: string }>(null);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [outcome, setOutcome] = useState<Record<string, ItemOutcome>>({});
  const [running, setRunning] = useState<null | "generate" | "render" | "variants">(null);
  const [confirm, setConfirm] = useState<null | { kind: "render" | "variants" | "generate"; ids?: string[] }>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const variants = useProjectVariants(projectId);
  const [view, setView] = useState<"studio" | "timeline">(params.get("view") === "timeline" ? "timeline" : "studio");

  const pending = pendingMediaCount(doc);
  const estimate = useQuery({
    queryKey: [...videoKeys.project(projectId), "estimate", head],
    queryFn: () => estimateProject(projectId, null, { organizationId }),
    enabled: Boolean(organizationId),
  });

  const sum = estimate.data ? summarizeEstimate(estimate.data) : null;
  const reload = () => queryClient.invalidateQueries({ queryKey: videoKeys.project(projectId) });

  const save = async (ops: PatchOp[], base: number, note: string) => {
    await appendPatch(projectId, { base_version: base, patch: { baseVersion: base, ops: ops as unknown as Record<string, unknown>[] }, note }, { organizationId });
  };

  /** One edit. A refusal because the video moved on rebases the pending edit onto the new head; nothing is dropped. */
  const patch = async (ops: PatchOp[], note: string, what = note, base = head): Promise<boolean> => {
    if (!ops.length) return false;
    setSaving(true);
    try {
      await save(ops, base, note);
      await reload();
      return true;
    } catch (err) {
      if (conflictVersion(err) === null) {
        toast.error(err instanceof Error ? err.message : "Couldn't save the change");
        return false;
      }
      try {
        const fresh = await getVideoProject(projectId, { organizationId });
        const newHead = fresh.head_version;
        const rows = await readCompositionHistory(projectId, base);
        const moved = rebasePending(ops, base, rows, newHead);
        await reload();
        if (moved.kind === "clean") {
          await save(moved.ops, newHead, note);
          await reload();
          toast.success(`Saved as v${newHead + 1}. Someone saved v${newHead} first; your change was kept.`);
          return true;
        } else {
          const headDoc = fresh.composition?.document as unknown as Composition | undefined;
          setConflict({
            ops,
            note,
            what,
            head: newHead,
            theirs: moved.kind === "overlap" && headDoc ? describeTheirs(headDoc, moved.paths) : "a newer version",
          });
        }
      } catch (inner) {
        toast.error(inner instanceof Error ? inner.message : "Couldn't save the change");
        await reload();
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const keepMine = async () => {
    const c = conflict;
    if (!c) return;
    setConflict(null);
    await patch(c.ops, c.note, c.what, c.head);
  };

  // A look or shape click is a saved version; the toast beside it puts the previous value back (as a new version, history kept).
  const patchRef = useRef(patch);
  useEffect(() => {
    patchRef.current = patch;
  });
  const changeWithUndo = async (ops: PatchOp[], note: string, undoOps: PatchOp[] | null) => {
    const ok = await patch(ops, note);
    if (ok && undoOps) {
      toast(`Changed ${note.replace(":", " to")}`, { action: { label: "Undo", onClick: () => void patchRef.current(undoOps, `undo ${note}`) }, duration: 8000 });
    }
  };

  const captionTrack = Object.keys(doc.tracks.captions)[0] ?? null;
  const preset = captionTrack ? doc.tracks.captions[captionTrack]?.style.preset ?? "" : "";
  const labelOf = (id: string) => (id === HEAD_ITEM ? "the video" : (variants.data?.find((v) => v.id === id)?.label ?? "variant"));

  const runGenerate = async (confirmed: boolean) => {
    setRunning("generate");
    setFailure(null);
    setSteps([{ id: "price", label: "Pricing", state: "running" }]);
    let needsConfirm = false;
    let errored: string | null = null;
    try {
      await streamGenerate(projectId, { version: head, confirmed, apply: true }, { organizationId }, (e) => {
        const media = typeof e.media_id === "string" ? e.media_id : "";
        if (e.type === "confirmation_required") needsConfirm = true;
        else if (e.type === "estimate") setSteps((p) => pushStep(p, { id: "price", label: "Priced", state: "done", meta: points(Number(e.total_points)) }));
        else if (e.type === "generating") setSteps((p) => pushStep(p, { id: media, label: `Making ${mediaLabel(media)}`, state: "running" }));
        else if (e.type === "generated")
          setSteps((p) => p.map((s) => (s.id === media ? { ...s, label: `${mediaLabel(media)} made`, state: "done", meta: dollars(Number(e.cost_usd)) } : s)));
        else if (e.type === "cache_hit") setSteps((p) => pushStep(p, { id: media, label: `${mediaLabel(media)} reused`, state: "done", meta: "$0.00" }));
        else if (e.type === "applying") setSteps((p) => pushStep(p, { id: "apply", label: "Placing files and syncing captions", state: "running" }));
        else if (e.type === "applied") setSteps((p) => pushStep(p, { id: "apply", label: `Saved as v${String(e.version)}`, state: "done" }));
        else if (e.type === "error" || e.type === "preflight_failed") errored = String(e.message ?? e.code ?? "Generation failed");
      });
      if (needsConfirm) {
        setConfirm({ kind: "generate" });
        setSteps((p) => closeSteps(p));
        return;
      }
      if (errored) throw new Error(errored);
      setSteps((p) => closeSteps(p));
      await reload();
    } catch (err) {
      setSteps((p) => closeSteps(p, "failed"));
      setFailure(err);
    } finally {
      setRunning(null);
    }
  };

  const runBatch = async (kind: "render" | "variants", ids: string[], confirmed: boolean) => {
    setRunning(kind);
    setFailure(null);
    setSteps([{ id: "start", label: kind === "render" ? "Starting the render" : `Starting ${ids.length} variants`, state: "running" }]);
    const flags = { confirm: false, error: null as string | null, failed: 0 };
    try {
      await streamBatch(
        projectId,
        kind === "render" ? { head: true, variant_ids: [], renderer, confirmed } : { variant_ids: ids, renderer, confirmed },
        { organizationId },
        batchHandler(setSteps, setOutcome, labelOf, flags),
      );
      if (flags.confirm) {
        setConfirm({ kind, ids });
        setSteps((p) => closeSteps(p));
        return;
      }
      if (flags.error) throw new Error(flags.error);
      setSteps((p) => closeSteps(p));
      await reload();
    } catch (err) {
      setSteps((p) => closeSteps(p, "failed"));
      setFailure(err);
    } finally {
      setRunning(null);
    }
  };

  const headOut = outcome[HEAD_ITEM];
  const busy = running !== null || saving;
  const timelineView = view === "timeline";
  return (
    <div className="flex min-h-0 flex-col gap-3">
    <SegmentedControl
      aria-label="View"
      value={view}
      onValueChange={(v) => setView(v as "studio" | "timeline")}
      data={[
        { value: "studio", label: "Studio" },
        { value: "timeline", label: "Timeline" },
      ]}
    />
    {timelineView ? <TimelinePanel doc={doc} disabled={running !== null} onOps={(ops, note) => patch(ops, note)} /> : null}
    <div className={cn("grid min-h-0 grid-cols-1 gap-4", !timelineView && "lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]")}>
      <section className="flex min-w-0 flex-col gap-3">
        {timelineView ? null : <CompositionPreview doc={doc} className="mx-auto w-full max-w-[22rem]" />}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="type-label text-foreground">Make it</span>
            <span className="ml-auto">
              {sum ? <CostLine label={estimateLabel(sum)} usd={sum.usd} pts={sum.points} /> : null}
            </span>
          </div>
          {estimate.data && perSecondLine(estimate.data) ? <span className="type-meta text-muted-foreground">{perSecondLine(estimate.data)}</span> : null}
          {estimate.data && musicCostLine(estimate.data) ? <span className="type-meta text-muted-foreground">{musicCostLine(estimate.data)}</span> : null}
          {estimate.data && confirmLine(estimate.data) ? <span className="type-meta text-muted-foreground">{confirmLine(estimate.data)}</span> : null}
          <div className="flex flex-wrap items-center gap-2">
            {pending || (sum && sum.toMake > 0) ? (
              <Button variant="primary" disabled={busy} onClick={() => void runGenerate(false)}>
                Generate
              </Button>
            ) : null}
            <Button variant={pending || (sum && sum.toMake > 0) ? "outline" : "primary"} icon={<Clapperboard />} disabled={busy} onClick={() => void runBatch("render", [], false)}>
              Render
            </Button>
            {localAllowed ? (
              <Select
                aria-label="Renderer"
                value={renderer}
                onValueChange={(v) => setRenderer(v as Renderer)}
                options={[
                  { value: "local", label: "Local server (dev)" },
                  { value: "hosted", label: "Render fleet" },
                ]}
                variant="inline"
              />
            ) : null}
            {headOut?.status ? <Badge tone={headOut.status === "failed" ? "destructive" : headOut.status === "rendered" ? "success" : "info"}>{headOut.status}</Badge> : null}
          </div>
          {confirm ? (
            <div className="flex items-center gap-2">
              <span className="type-body text-foreground">Over your confirmation setting</span>
              <Button
                variant="primary"
                className="ml-auto"
                onClick={() => {
                  const c = confirm;
                  setConfirm(null);
                  if (c.kind === "generate") void runGenerate(true);
                  else void runBatch(c.kind, c.ids ?? [], true);
                }}
              >
                Go ahead
              </Button>
              <Button variant="quiet" onClick={() => setConfirm(null)}>
                Not now
              </Button>
            </div>
          ) : null}
          {conflict ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-2" role="group" aria-label="Edit conflict">
              <span className="type-label text-foreground">{`This video changed to v${conflict.head} while you were editing`}</span>
              <span className="type-body text-foreground">{`Your change: ${conflict.what}`}</span>
              <span className="type-body text-foreground">{`Their change: ${conflict.theirs}`}</span>
              <div className="flex items-center gap-2">
                <Button variant="primary" disabled={busy} onClick={() => void keepMine()}>
                  Keep mine
                </Button>
                <Button variant="outline" onClick={() => setConflict(null)}>
                  Take theirs
                </Button>
              </div>
            </div>
          ) : null}
          <RunLog steps={steps} />
          {failure ? <FailureLine error={failure} operation="video render" /> : null}
          {headOut?.fileId ? <OutputDownload fileId={headOut.fileId} label="The video" fileName={downloadName(answer.name)} /> : null}
        </div>
        <Outputs answer={answer} busy={busy} onRenderAgain={() => void runBatch("render", [], false)} onCards={new Set(Object.entries(outcome).filter(([k, o]) => k !== HEAD_ITEM && o.fileId).map(([, o]) => o.fileId as string))} />
      </section>

      {timelineView ? null : <section className="flex min-w-0 flex-col gap-4">
        <Block title="Script" icon={<Type className="size-4" />}>
          <ScriptEditor doc={doc} disabled={busy} onOps={(ops, note, what) => void patch(ops, note, what)} />
        </Block>
        <Block title="Look" icon={<Palette className="size-4" />}>
          {captionTrack ? (
            <CaptionLookPicker
              value={preset}
              disabled={busy}
              onChange={(id) =>
                void changeWithUndo(
                  [{ op: "set", path: ["tracks", "captions", captionTrack, "style"], value: { preset: id } }],
                  `captions: ${id}`,
                  preset ? [{ op: "set", path: ["tracks", "captions", captionTrack, "style"], value: { preset } }] : null,
                )
              }
            />
          ) : (
            <span className="type-meta text-muted-foreground">This plan has no captions</span>
          )}
          <div className="flex items-center gap-2">
            <span className="type-label text-foreground">Shape</span>
            <SegmentedControl
              aria-label="Shape"
              value={doc.timeline.aspect as CloneAspect}
              onValueChange={(v) => void changeWithUndo(setAspectOps(v as CloneAspect), `shape: ${v}`, setAspectOps(doc.timeline.aspect as CloneAspect))}
              data={ASPECTS}
            />
          </div>
        </Block>
        <Block title="Music" icon={<Music className="size-4" />}>
          <ProjectMusic key={head} doc={doc} disabled={busy} onChoose={(c) => void patch(musicOps(doc, c, videoSecondsOf(doc)) as PatchOp[], `music: ${c.kind === "none" ? "none" : c.kind === "bed" ? `${c.mood} ${c.tempo}` : "own track"}`)} />
        </Block>
        <Block title="Variants" icon={<Layers className="size-4" />}>
          <VariantsPanel
            doc={doc}
            head={head}
            projectId={projectId}
            projectName={answer.name}
            variants={variants.data ?? []}
            loading={variants.isPending}
            outcome={outcome}
            busy={busy}
            openDraft={params.get("variants") === "3"}
            onRun={(ids) => void runBatch("variants", ids, false)}
            onCreated={() => void variants.refetch()}
          />
        </Block>
      </section>}
    </div>
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <span className="inline-flex items-center gap-1.5 type-label text-foreground">
        {icon}
        {title}
      </span>
      {children}
    </div>
  );
}

// ── script ──────────────────────────────────────────────────────────────────────────────────────────

function ScriptEditor({ doc, disabled, onOps }: { doc: Composition; disabled: boolean; onOps: (ops: PatchOp[], note: string, what: string) => void }) {
  const [editing, setEditing] = useState<{ turn: string; word: string; text: string } | null>(null);
  /** An edit that leaves the word as it is changes nothing and makes no version. */
  const changed = (e: { turn: string; word: string; text: string }, kind: "captions" | "voice") => {
    const w = doc.script.turns.find((t) => t.id === e.turn)?.words.find((x) => x.id === e.word);
    const next = e.text.trim();
    if (!next || !w) return false;
    return next !== (kind === "voice" ? (w.spoken ?? w.text) : w.text);
  };
  return (
    <div className="flex flex-col gap-2">
      {doc.script.turns.map((turn) => (
        <p key={turn.id} className="flex flex-wrap gap-x-1 gap-y-0.5 type-body text-foreground">
          {turn.words.map((w) => {
            const active = editing?.turn === turn.id && editing.word === w.id;
            const shownDiffers = w.spoken !== undefined && w.spoken !== w.text;
            return (
              <button
                key={w.id}
                type="button"
                disabled={disabled}
                data-clickable
                title={shownDiffers ? `Says "${w.spoken}"` : undefined}
                onClick={() => setEditing({ turn: turn.id, word: w.id, text: w.text })}
                className={cn("rounded px-0.5 hover:bg-muted", active && "bg-primary text-primary-foreground", shownDiffers && "underline decoration-dotted")}
              >
                {w.text}
              </button>
            );
          })}
        </p>
      ))}
      {editing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
          {/* ui-exception: one word, not a writing box */}
          <Field value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} className="w-40" autoFocus />
          <Button
            variant="primary"
            disabled={disabled || !changed(editing, "captions")}
            onClick={() => {
              if (!changed(editing, "captions")) return setEditing(null);
              onOps(editWordOps(doc, editing.turn, editing.word, editing.text.trim(), "captions"), "caption word", `caption "${editing.text.trim()}"`);
              setEditing(null);
            }}
          >
            Caption only
          </Button>
          <Button
            variant="outline"
            disabled={disabled || !changed(editing, "voice")}
            onClick={() => {
              if (!changed(editing, "voice")) return setEditing(null);
              onOps(editWordOps(doc, editing.turn, editing.word, editing.text.trim(), "voice"), "spoken word", `say "${editing.text.trim()}"`);
              setEditing(null);
            }}
          >
            Change what's said
          </Button>
          <Button variant="quiet" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <span className="type-meta w-full text-muted-foreground">Changing what's said re-makes the voice on the next Generate</span>
        </div>
      ) : (
        <span className="type-meta text-muted-foreground">Click a word to change it</span>
      )}
    </div>
  );
}

// ── variants ────────────────────────────────────────────────────────────────────────────────────────

type DraftKind = "hook" | "captions" | "aspect";

interface Draft {
  kind: DraftKind;
  value: string;
}

function draftDefaults(doc: Composition, currentPreset: string): Draft[] {
  const other = CAPTION_PRESET_IDS.find((id) => id !== currentPreset) ?? CAPTION_PRESET_IDS[0] ?? "";
  return [
    { kind: "hook", value: "" },
    { kind: "captions", value: other },
    { kind: "aspect", value: doc.timeline.aspect === "1:1" ? "4:5" : "1:1" },
  ];
}

function paramSet(d: Draft): ParamSet | null {
  if (d.kind === "hook") return d.value.trim() ? { label: `Hook: ${cutText(d.value.trim(), 40)}`, hook_text: d.value.trim() } : null;
  if (d.kind === "captions") return d.value ? { label: `Captions: ${CAPTION_PRESETS[d.value]?.label ?? d.value}`, caption_preset: d.value } : null;
  return d.value ? { label: `Shape ${d.value}`, aspect: d.value as CloneAspect } : null;
}

function VariantsPanel({
  doc,
  head,
  projectId,
  projectName,
  variants,
  loading,
  outcome,
  busy,
  openDraft,
  onRun,
  onCreated,
}: {
  doc: Composition;
  head: number;
  projectId: string;
  projectName: string;
  variants: VariantAnswer[];
  loading: boolean;
  outcome: Record<string, ItemOutcome>;
  busy: boolean;
  openDraft: boolean;
  onRun: (ids: string[]) => void;
  onCreated: () => void;
}) {
  const { organizationId } = useSocials();
  const captionTrack = Object.keys(doc.tracks.captions)[0];
  const currentPreset = captionTrack ? (doc.tracks.captions[captionTrack]?.style.preset ?? "") : "";
  const [drafts, setDrafts] = useState<Draft[] | null>(openDraft ? draftDefaults(doc, currentPreset) : null);
  const [creating, setCreating] = useState(false);

  // What a click will create: the filled-in rows, minus any the project already has (same overrides = the same variant).
  const asked = (drafts ?? []).map(paramSet).filter((p): p is ParamSet => p !== null);
  const { fresh, reused } = splitNewSets(asked, variants.map((v) => v.label));
  const emptyRows = (drafts ?? []).length - asked.length;
  const createText = createButtonText(fresh.length);

  const create = async () => {
    if (!fresh.length) return;
    setCreating(true);
    try {
      const out = await createVariantMatrix(projectId, fresh, { organizationId });
      toast.success(matrixOutcomeText(out.variants));
      setDrafts(null);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the variants");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {loading ? <RegionSkeleton shape="cards" count={3} aria-label="Loading variants" /> : null}
      {variants.length ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {variants.map((v) => (
            <VariantCard key={v.id} v={v} doc={doc} head={head} outcome={outcome[v.id]} projectName={projectName} />
          ))}
        </div>
      ) : null}
      {drafts ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
          {drafts.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Variant change"
                value={d.kind}
                onValueChange={(k) =>
                  setDrafts((prev) =>
                    (prev ?? []).map((x, j) =>
                      j === i ? { kind: k as DraftKind, value: k === "aspect" ? "1:1" : k === "captions" ? (CAPTION_PRESET_IDS[0] ?? "") : "" } : x,
                    ),
                  )
                }
                options={[
                  { value: "hook", label: "Hook line" },
                  { value: "captions", label: "Caption look" },
                  { value: "aspect", label: "Shape" },
                ]}
              />
              {d.kind === "hook" ? (
                <Field
                  placeholder="A different opening line"
                  value={d.value}
                  maxLength={120}
                  className="min-w-0 flex-1"
                  onChange={(e) => setDrafts((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                />
              ) : d.kind === "captions" ? (
                <Select
                  aria-label="Caption look"
                  value={d.value}
                  onValueChange={(val) => setDrafts((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, value: val } : x)))}
                  options={CAPTION_PRESET_IDS.map((id) => ({ value: id, label: CAPTION_PRESETS[id]?.label ?? id }))}
                />
              ) : (
                <SegmentedControl
                  aria-label="Shape"
                  value={d.value as CloneAspect}
                  onValueChange={(val) => setDrafts((prev) => (prev ?? []).map((x, j) => (j === i ? { ...x, value: val } : x)))}
                  data={ASPECTS}
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={creating || busy || !createText} onClick={() => void create()}>
              {createText ?? "Nothing new to create"}
            </Button>
            <Button variant="quiet" onClick={() => setDrafts(null)}>
              Cancel
            </Button>
            <span className="type-meta ml-auto text-muted-foreground">Free until you render</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {emptyRows > 0 ? <span className="type-meta text-muted-foreground">{`${countWord(emptyRows, "row")} left empty, so not included`}</span> : null}
            {reused.length > 0 ? <span className="type-meta text-muted-foreground">{`${reused.length} already made: ${reused.map((r) => r.label).join(", ")}`}</span> : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Layers />} disabled={busy} onClick={() => setDrafts(draftDefaults(doc, currentPreset))}>
            Add variants
          </Button>
          {variants.length ? (
            <Button variant="primary" disabled={busy} onClick={() => onRun(variants.map((v) => v.id))}>
              {`Render ${countWord(variants.length)}`}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function VariantCard({ v, doc, head, outcome, projectName }: { v: VariantAnswer; doc: Composition; head: number; outcome?: ItemOutcome; projectName: string }) {
  // A variant made on an older version still shows its look: its overrides are laid over the current head (the render does the same).
  const rebased = v.baseVersion !== head;
  const materialized = materializeVariant(doc, (rebased ? { ...v, baseVersion: doc.version } : v) as unknown as VariantOverride);
  return (
    <div className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border p-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="type-label truncate text-foreground">{v.label}</span>
        <Badge tone={outcome?.status === "failed" ? "destructive" : outcome?.status === "rendered" ? "success" : "neutral"} className="ml-auto">
          {outcome?.status ?? (rebased ? rebasedLabel(v.baseVersion, head) : "ready")}
        </Badge>
      </div>
      {materialized?.ok ? (
        <CompositionPreview doc={materialized.doc} />
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-muted p-4 type-meta text-muted-foreground" style={{ aspectRatio: "9 / 16" }}>
          {rebased ? `Can't show this on v${head} (made on v${v.baseVersion}); it is rebased when rendered` : "Can't preview"}
        </div>
      )}
      {outcome?.error ? <ErrorAlchemyMenu error={new Error(outcome.error)} operation="video variant render" /> : null}
      {outcome?.usd !== undefined ? (
        outcome.renderFree && !outcome.usd ? <span className="type-meta text-muted-foreground">Render · free</span> : <CostLine usd={outcome.usd} pts={outcome.pts} />
      ) : null}
      {outcome?.fileId ? <OutputDownload fileId={outcome.fileId} label={v.label} fileName={variantDownloadName(projectName, v.label)} /> : null}
    </div>
  );
}

// ── every finished output ───────────────────────────────────────────────────────────────────────────

function Outputs({ answer, busy, onRenderAgain, onCards }: { answer: VideoProjectAnswer; busy: boolean; onRenderAgain: () => void; onCards: Set<string> }) {
  if (!answer.output_file_ids.length) return null;
  // A variant's video has its own card with its own Download; the list holds the rest, so no card has two.
  const rows = outputRows(answer).filter((r) => !onCards.has(r.fileId));
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <span className="type-label text-foreground">{`Finished videos (${rows.length})`}</span>
      {rows.map((r, i) => (
        <div key={r.fileId} className="flex min-w-0 flex-col gap-1">
          <OutputDownload fileId={r.fileId} label={r.label} fileName={downloadName(`${answer.name}${r.version !== null ? ` v${r.version}` : ""}`)} />
          {r.stale && i === 0 ? (
            <div className="flex items-center gap-2">
              <span className="type-meta text-warning">{`The video is now v${answer.head_version}; this file does not have your latest changes`}</span>
              <Button variant="outline" className="ml-auto" disabled={busy} onClick={onRenderAgain}>
                Render again
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** The project's music: what it carries now, changed through one patch (a bed is made when you press Generate). */
function ProjectMusic({ doc, disabled, onChoose }: { doc: Composition; disabled: boolean; onChoose: (c: MusicChoice) => void }) {
  const [draft, setDraft] = useState<MusicChoice>(() => musicOfDocument(doc as never));
  return (
    <MusicPicker
      value={draft}
      disabled={disabled}
      onChange={(c) => {
        setDraft(c);
        // A track kind waits for its upload; every other pick is saved at once.
        if (c.kind === "file" && !c.file.fileId) return;
        onChoose(c);
      }}
    />
  );
}
