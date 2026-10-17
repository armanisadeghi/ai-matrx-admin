"use client";

/**
 * Socials → Videos → New clone. Left: the reference post (its stored video + the structure analysis: shots, beats,
 * hook, on-screen text, why it works; "Analyze" streams it when it is missing). Right: the brief (product, who
 * presents, the script, hook line, caption look, shape) → Plan (the director's clone-plan door: the plan becomes the
 * project's next version and comes back with its estimate) → Generate (the generation door, confirmation above the
 * organization's setting; files land on the project) → the project page.
 *
 * `?post=<id>` names the reference; `?project=<id>` resumes a clone already started; `?variants=3` carries on to the
 * variants grid after generating.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Film, ImagePlus, Mic, Play, ScanSearch, Upload, UserRound, Video, PenLine } from "lucide-react";

import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { Badge, Button, EmptyState, Field, RegionSkeleton, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { uploadFile } from "@/features/files/api/files";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { toast } from "@/lib/toast";
import { currentPathWithSearch, replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { cn } from "@/lib/utils";

import {
  analyzeReference,
  dollars,
  fetchTeleprompter,
  points,
  runClonePlan,
  streamGenerate,
  type BriefFile,
  type CloneAspect,
  type ClonePlanResult,
  type LineEvent,
  type PresenterMode,
  type ServerCloneBrief,
  type TeleprompterAnswer,
} from "../../video/clone";
import { useReferencePost, useVideoStructure, videoKeys } from "../../video/hooks";
import { createVideoProject, fetchPostWords } from "../../video/server";
import { contentHashOf, useBrandOfferings, useFileUrls, useReferenceVideo, useScriptWriterReady } from "../../video/studio-hooks";
import { useSocials } from "../SocialsContext";
import { brandNameIn } from "../../video/hook-brand";
import { estimateLabel, summarizeEstimate } from "../../video/estimate";
import { plainRenderMessage } from "../../video/render-errors";
import { CaptionLookPicker, CostLine, FailureLine, RunLog, closeSteps, pushStep, type RunStep } from "./StudioParts";

const ASPECTS: ReadonlyArray<{ value: CloneAspect; label: string }> = [
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
];

const PRESENTERS: ReadonlyArray<{ value: PresenterMode; label: string; icon: React.ReactNode; hint: string }> = [
  { value: "voiceover", label: "Voiceover", icon: <Mic className="size-4" />, hint: "AI voice + pictures · lowest cost" },
  { value: "own_footage", label: "My own footage", icon: <Video className="size-4" />, hint: "You film it · pictures only" },
  { value: "generated_presenter", label: "AI presenter", icon: <UserRound className="size-4" />, hint: "Talking video per line · highest cost" },
];

/** A friendly name for a composition media id (the director's stable naming). */
export function mediaLabel(id: string): string {
  if (/^take-\d+/.test(id)) return `Take ${Number(id.slice(5))}`;
  if (/^broll-\d+/.test(id)) return `Picture ${Number(id.slice(6)) + 1}`;
  if (id.startsWith("product-")) return "Product photo";
  if (id === "presenter-portrait") return "Presenter portrait";
  if (id.startsWith("spokesperson-")) return "Spokesperson";
  if (id === "music") return "Music";
  return id;
}

function secondsOf(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      URL.revokeObjectURL(el.src);
      resolve(Number.isFinite(d) ? Math.round(d * 1000) / 1000 : undefined);
    };
    el.onerror = () => resolve(undefined);
    el.src = URL.createObjectURL(file);
  });
}

async function uploadBriefFile(file: File, folder: string): Promise<BriefFile> {
  const { data } = await uploadFile({ file, filePath: `${folder}/${Date.now()}-${file.name}` });
  const hash = contentHashOf(data.checksum);
  if (!hash) throw new Error("The upload has no content hash yet; try again.");
  const out: BriefFile = { fileId: data.file_id, contentHash: hash };
  if (file.type.startsWith("video/")) {
    const s = await secondsOf(file);
    if (s) out.durationSeconds = s;
  }
  return out;
}

export function VideoCloneNew() {
  const params = useSearchParams();
  const postId = params.get("post");
  const wantVariants = params.get("variants") === "3";
  const [projectId, setProjectId] = useState<string | null>(params.get("project"));
  const { brandSeg } = useSocials();
  const base = `${marketingRoutes.brandSocials(brandSeg)}/videos`;

  if (!postId) {
    return (
      <EmptyState
        icon={<Clapperboard />}
        title="Pick a post to clone"
        line="Use Clone on any outlier or swipe-file post"
        action={
          <Button asChild variant="primary">
            <Link href={`${marketingRoutes.brandSocials(brandSeg)}/outliers`}>Open outliers</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button asChild variant="quiet" icon={<ArrowLeft />}>
          <Link href={base}>Videos</Link>
        </Button>
        <span className="type-title text-foreground">New clone</span>
        {wantVariants ? <Badge tone="info">+ 3 variants</Badge> : null}
      </div>
      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ReferencePanel postId={postId} />
        <BriefPanel postId={postId} projectId={projectId} onProject={setProjectId} wantVariants={wantVariants} base={base} />
      </div>
    </div>
  );
}

// ── the reference ───────────────────────────────────────────────────────────────────────────────────

function ReferencePanel({ postId }: { postId: string }) {
  const { organizationId } = useSocials();
  const queryClient = useQueryClient();
  const post = useReferencePost(postId);
  const structure = useVideoStructure(postId);
  const video = useReferenceVideo(postId);
  const { facts } = useFileUrls(video.data ? [video.data.file_id] : []);
  const url = video.data ? facts[video.data.file_id]?.url : null;
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [busy, setBusy] = useState(false);
  const costKey = `video-analysis-cost:${postId}`;
  const [lastCost, setLastCost] = useState<{ usd: number; points: number; reused: boolean } | null>(null);
  // What the analysis spent stays on the page for this reference, through reloads (the structure replaces the run log).
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(costKey);
      if (saved) setLastCost(JSON.parse(saved) as { usd: number; points: number; reused: boolean });
    } catch {
      /* no saved cost */
    }
  }, [costKey]);

  const analyze = async () => {
    setBusy(true);
    setSteps([{ id: "start", label: "Starting analysis", state: "running" }]);
    try {
      const result = await analyzeReference(postId, { organizationId }, (s) =>
        setSteps((prev) => pushStep(prev, { id: s.stage || s.label, label: s.label, state: "running", meta: s.total ? `${s.current}/${s.total}` : undefined })),
      );
      setSteps((prev) => closeSteps(prev));
      const spent = { usd: result.cost?.usd ?? 0, points: result.cost?.points ?? 0, reused: result.status === "reused" };
      setLastCost(spent);
      try {
        window.sessionStorage.setItem(costKey, JSON.stringify(spent));
      } catch {
        /* storage full or blocked: the line still shows for this visit */
      }
      // Analysis lands the post's video and its words too: re-read all three.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: videoKeys.post(postId) }),
        queryClient.invalidateQueries({ queryKey: ["marketing", "social", "video", "post-media", postId] }),
      ]);
    } catch (err) {
      setSteps((prev) => [...closeSteps(prev, "failed"), { id: "err", label: err instanceof Error ? err.message : "Analysis failed", state: "failed" }]);
    } finally {
      setBusy(false);
    }
  };

  const s = structure.data;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="type-label text-foreground">Reference</span>
        {post.data?.platform ? <Badge>{post.data.platform}</Badge> : null}
        {s?.durationSeconds ? <span className="type-meta text-muted-foreground">{s.durationSeconds.toFixed(1)}s</span> : null}
        {post.data?.url ? (
          <a href={post.data.url} target="_blank" rel="noreferrer" className="type-meta ml-auto text-muted-foreground underline">
            Original
          </a>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: "9 / 16" }}>
        {url ? (
          <video src={url} controls playsInline className="h-full w-full object-contain" />
        ) : video.isPending ? (
          <div className="h-full w-full animate-pulse" aria-label="Loading video" />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center type-meta text-muted-foreground">
            <Film className="mr-1 size-4" /> No stored video yet
          </div>
        )}
      </div>
      {structure.isPending ? (
        <RegionSkeleton shape="rows" count={4} aria-label="Loading analysis" />
      ) : structure.isError ? (
        <ErrorAlchemyMenu error={structure.error} operation="read video analysis" />
      ) : !s ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="type-body text-muted-foreground">Not analyzed yet</span>
            <Button variant="primary" icon={<ScanSearch />} className="ml-auto" disabled={busy} onClick={() => void analyze()}>
              Analyze
            </Button>
          </div>
          <span className="type-meta text-muted-foreground">Uses AI points · usually a few cents</span>
          <RunLog steps={steps} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <RunLog steps={steps} />
          {lastCost ? <CostLine label={lastCost.reused ? "Analysis reused" : "Analysis cost"} usd={lastCost.usd} pts={lastCost.points} /> : null}
          <div className="flex flex-wrap gap-1.5">
            <Badge>{`${s.shots.length} shots`}</Badge>
            {s.beats.length ? <Badge>{`${s.beats.length} beats`}</Badge> : null}
            {s.pacing?.cuts_per_min ? <Badge>{`${Math.round(s.pacing.cuts_per_min)} cuts/min`}</Badge> : null}
            {s.nearestCaptionPreset ? <Badge>{`Captions: ${s.nearestCaptionPreset}`}</Badge> : null}
          </div>
          {s.hook ? (
            <Fact label="Hook">
              {s.hook.on_screen_text || s.hook.spoken_text || s.hook.visual || "—"}
              {s.hook.device ? <span className="type-meta ml-1 text-muted-foreground">({s.hook.device})</span> : null}
            </Fact>
          ) : null}
          {s.onScreenText.length ? <Fact label="On-screen text">{s.onScreenText.map((t) => t.text).join(" · ")}</Fact> : null}
          {s.whyItWorks ? <Fact label="Why it works">{s.whyItWorks}</Fact> : null}
          {s.beats.length ? (
            <Fact label="Beats">
              <ol className="flex flex-col gap-0.5">
                {s.beats.map((b, i) => (
                  <li key={`${b.role}-${i}`} className="type-meta text-foreground">
                    <span className="tabular-nums text-muted-foreground">{b.start.toFixed(1)}s</span> {b.role}
                    {b.summary ? <span className="text-muted-foreground"> — {b.summary}</span> : null}
                  </li>
                ))}
              </ol>
            </Fact>
          ) : null}
          <Fact label="Shots">
            <div className="flex h-3 w-full overflow-hidden rounded-sm" aria-label="Shot rhythm">
              {s.shots.map((sh, i) => (
                <span
                  key={i}
                  title={`${sh.start.toFixed(1)}–${sh.end.toFixed(1)}s ${sh.roll === "a_roll" ? "A-roll" : "B-roll"}${sh.description ? ` · ${sh.description}` : ""}`}
                  className={cn("h-full border-r border-card", sh.roll === "a_roll" ? "bg-primary" : "bg-muted-foreground")}
                  style={{ flexGrow: Math.max(0.05, sh.end - sh.start) }}
                />
              ))}
            </div>
          </Fact>
        </div>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="type-meta text-muted-foreground">{label}</span>
      <div className="type-body text-foreground">{children}</div>
    </div>
  );
}

// ── the brief ───────────────────────────────────────────────────────────────────────────────────────

type Phase = "brief" | "planning" | "planned" | "generating" | "confirm" | "done";

function BriefPanel({
  postId,
  projectId,
  onProject,
  wantVariants,
  base,
}: {
  postId: string;
  projectId: string | null;
  onProject: (id: string) => void;
  wantVariants: boolean;
  base: string;
}) {
  const brand = useMarketingBrand();
  const { brandId, organizationId } = useSocials();
  const router = useRouter();
  const queryClient = useQueryClient();
  const post = useReferencePost(postId);
  const structure = useVideoStructure(postId);
  const offerings = useBrandOfferings();
  const words = useQuery({
    queryKey: [...videoKeys.post(postId), "words"],
    queryFn: () => fetchPostWords(postId, { organizationId }),
    enabled: Boolean(structure.data && organizationId),
    staleTime: Infinity,
  });

  const [productKey, setProductKey] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<BriefFile | null>(null);
  const [presenter, setPresenter] = useState<PresenterMode>("voiceover");
  const [script, setScript] = useState<string | null>(null);
  const [hookLine, setHookLine] = useState("");
  const [hookTouched, setHookTouched] = useState(false);
  const [aiRewrite, setAiRewrite] = useState(false);
  const scriptWriterReady = useScriptWriterReady();
  const [captionLook, setCaptionLook] = useState<string>("match");
  const [aspect, setAspect] = useState<CloneAspect>("9:16");
  const [takes, setTakes] = useState<Array<{ name: string; file: BriefFile }>>([]);
  const [teleprompter, setTeleprompter] = useState<TeleprompterAnswer | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("brief");
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [plan, setPlan] = useState<ClonePlanResult | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [spent, setSpent] = useState(0);

  // The reference's on-screen text that stays when no hook line is typed: warn when it names a business.
  const keptTexts = [structure.data?.hook?.on_screen_text, ...(structure.data?.onScreenText.map((t) => t.text) ?? [])].filter((t): t is string => Boolean(t));
  const keptBrand = keptTexts.map((t) => brandNameIn(t, brand.name)).find(Boolean) ?? null;
  const hookSource = structure.data?.hook?.on_screen_text ?? "";
  const hookNamesBrand = brandNameIn(hookSource, brand.name);
  // The field shows the reference hook with the other business's name swapped for this brand until the person types.
  const hookPrefill = hookNamesBrand ? hookSource.replace(hookNamesBrand, brand.name).slice(0, 120) : "";
  const hookValue = hookTouched ? hookLine : hookPrefill;
  const hookPrefilledFrom = !hookTouched && hookPrefill ? hookNamesBrand : null;

  const referenceScript = (words.data?.words ?? []).map((w) => w.text).join(" ").trim();
  const scriptText = script ?? referenceScript;
  const offering = offerings.data?.find((o) => o.key === productKey) ?? null;
  const product = offering ? offering.name : productName.trim();
  const busy = phase === "planning" || phase === "generating" || uploading !== null;

  const ensureProject = async (): Promise<string> => {
    if (projectId) return projectId;
    const caption = (post.data?.caption ?? "").replace(/\s+/g, " ").trim();
    const name = `${product || brand.name} · ${caption.slice(0, 40) || "clone"}`;
    const made = await createVideoProject({ post_id: postId, name, brand_id: brandId }, { organizationId });
    onProject(made.project_id);
    const next = new URLSearchParams(window.location.search);
    next.set("project", made.project_id);
    replaceAddressWithoutNavigating(currentPathWithSearch(next));
    void queryClient.invalidateQueries({ queryKey: videoKeys.all });
    return made.project_id;
  };

  const brief = (): ServerCloneBrief => ({
    brand: { id: brandId, name: brand.name },
    ...(product
      ? {
          product: {
            name: product.slice(0, 60),
            ...(offering?.offeringId ? { offeringId: offering.offeringId } : {}),
            ...(offering?.priceText ? { price: offering.priceText } : {}),
            ...(productImage ? { images: [productImage] } : {}),
          },
        }
      : {}),
    presenter: {
      mode: presenter,
      ...(presenter === "own_footage" ? { takes: takes.map((t) => ({ file: t.file })) } : {}),
    },
    script: aiRewrite ? { mode: "rewrite" } : scriptText ? { mode: "rewrite", text: scriptText } : { mode: "keep" },
    ...(hookValue.trim() ? { hookLine: hookValue.trim().slice(0, 120) } : {}),
    captions: captionLook === "match" ? { mode: "match" } : captionLook === "off" ? { mode: "off" } : { mode: "preset", preset: captionLook },
    aspect,
  });

  const showLines = async () => {
    try {
      const pid = await ensureProject();
      setTeleprompter(await fetchTeleprompter(pid, { brief: { script: { mode: "rewrite", text: scriptText } }, post_id: postId }, { organizationId }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build your lines");
    }
  };

  const upload = async (files: FileList | null, kind: "take" | "product") => {
    const list = files ? [...files] : [];
    if (!list.length) return;
    setUploading(kind);
    try {
      for (const f of list) {
        const made = await uploadBriefFile(f, kind === "take" ? "Video/Recordings" : "Video/Products");
        if (kind === "take") setTakes((prev) => [...prev, { name: f.name, file: made }]);
        else setProductImage(made);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const runPlan = async () => {
    setFailure(null);
    setPlan(null);
    setPhase("planning");
    setSteps([{ id: "project", label: projectId ? "Opening the project" : "Creating the project", state: "running" }]);
    try {
      const pid = await ensureProject();
      const result = await runClonePlan(pid, { brief: brief(), post_id: postId }, { organizationId }, (s) =>
        setSteps((prev) => pushStep(prev, { id: s.stage || s.label, label: s.label, state: "running" })),
      );
      setSteps((prev) => closeSteps(prev));
      setPlan(result);
      setPhase("planned");
      void queryClient.invalidateQueries({ queryKey: videoKeys.project(pid) });
    } catch (err) {
      setSteps((prev) => closeSteps(prev, "failed"));
      setFailure(err);
      setPhase("brief");
    }
  };

  const generate = async (confirmed: boolean) => {
    if (!plan) return;
    setFailure(null);
    setPhase("generating");
    setSpent(0);
    setSteps([{ id: "price", label: "Pricing", state: "running" }]);
    let needsConfirm = false;
    let errored: string | null = null;
    const onEvent = (e: LineEvent) => {
      const media = typeof e.media_id === "string" ? e.media_id : "";
      switch (e.type) {
        case "estimate":
          setSteps((p) => pushStep(p, { id: "price", label: "Priced", state: "done", meta: points(Number(e.total_points)) }));
          break;
        case "confirmation_required":
          needsConfirm = true;
          break;
        case "generating":
          setSteps((p) => pushStep(p, { id: media, label: `Making ${mediaLabel(media)}`, state: "running" }));
          break;
        case "cache_hit":
          setSteps((p) => pushStep(p, { id: media, label: `${mediaLabel(media)} reused`, state: "done", meta: "$0.00" }));
          break;
        case "generated":
          setSpent((v) => v + (Number(e.cost_usd) || 0));
          setSteps((p) => p.map((s) => (s.id === media ? { ...s, label: `${mediaLabel(media)} made`, state: "done", meta: dollars(Number(e.cost_usd)) } : s)));
          break;
        case "warning":
          setSteps((p) => [...p, { id: `w${p.length}`, label: String(e.message ?? "Warning"), state: "failed" }]);
          break;
        case "applying":
          setSteps((p) => pushStep(p, { id: "apply", label: "Placing files and syncing captions to the voice", state: "running" }));
          break;
        case "applied":
          setSteps((p) => pushStep(p, { id: "apply", label: `Saved as version ${String(e.version)}`, state: "done" }));
          break;
        case "preflight_failed":
        case "error":
          errored = plainRenderMessage(typeof e.code === "string" ? e.code : null, typeof e.user_message === "string" ? e.user_message : typeof e.message === "string" ? e.message : null);
          break;
        default:
          break;
      }
    };
    try {
      await streamGenerate(plan.project_id, { version: plan.version, confirmed, apply: true }, { organizationId }, onEvent);
      if (needsConfirm) {
        setSteps((p) => closeSteps(p));
        setPhase("confirm");
        return;
      }
      if (errored) throw new Error(errored);
      setSteps((p) => closeSteps(p));
      setPhase("done");
      await queryClient.invalidateQueries({ queryKey: videoKeys.project(plan.project_id) });
      router.push(`${base}/${plan.project_id}${wantVariants ? "?variants=3" : ""}`);
    } catch (err) {
      setSteps((p) => closeSteps(p, "failed"));
      setFailure(err);
      setPhase("planned");
    }
  };

  const est = plan?.estimate;
  const notes = plan?.report.notes ?? [];
  const writerSkipped = Boolean(plan && aiRewrite && plan.script_agent !== "ran");
  const ownFootageMissing = presenter === "own_footage" && takes.length === 0;
  const canPlan = Boolean(structure.data) && !busy && !ownFootageMissing && (scriptText.length > 0 || aiRewrite);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-3">
      <Row label="Product">
        <div className="flex flex-col gap-2">
          <Select
            aria-label="Product"
            value={productKey}
            onValueChange={(v) => setProductKey(v)}
            options={[
              { value: "", label: offerings.isPending ? "Loading products…" : "Name it myself" },
              ...(offerings.data ?? []).map((o) => ({ value: o.key, label: o.name })),
            ]}
          />
          {!offering ? (
            <Field placeholder="Product name" value={productName} maxLength={60} onChange={(e) => setProductName(e.target.value)} />
          ) : null}
          <div className="flex items-center gap-2">
            <FilePickButton accept="image/*" icon={<ImagePlus />} disabled={busy} onFiles={(f) => void upload(f, "product")}>
              {productImage ? "Replace photo" : "Product photo"}
            </FilePickButton>
            {uploading === "product" ? <span className="type-meta text-muted-foreground">Uploading…</span> : null}
            {productImage ? <Badge tone="success">Photo added</Badge> : <span className="type-meta text-muted-foreground">None: one is generated</span>}
          </div>
        </div>
      </Row>

      <Row label="Presenter">
        <div role="radiogroup" aria-label="Presenter" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PRESENTERS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={presenter === p.value}
              disabled={busy}
              onClick={() => setPresenter(p.value)}
              data-clickable
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border bg-card p-2 text-left",
                presenter === p.value ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <span className="inline-flex items-center gap-1.5 type-label text-foreground">
                {p.icon}
                {p.label}
              </span>
              <span className="type-meta text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </div>
      </Row>

      <Row
        label="Script"
        end={
          scriptWriterReady ? (
            <Button variant={aiRewrite ? "outline" : "quiet"} icon={<PenLine />} disabled={busy} onClick={() => setAiRewrite((v) => !v)}>
              {aiRewrite ? "Write it myself" : "AI rewrite"}
            </Button>
          ) : (
            <Button variant="quiet" icon={<PenLine />} onClick={() => void announceComingSoon("marketing.social.video-script-rewrite")}>
              AI rewrite · coming
            </Button>
          )
        }
      >
        {aiRewrite ? <span className="type-meta text-muted-foreground">The script is written for your product when you press Plan</span> : null}
        <ProTextarea
          value={scriptText}
          onChange={(e) => setScript(e.target.value)}
          placeholder={words.isPending && structure.data ? "Loading the reference script…" : "Write what the video says"}
          autoGrow
          minHeight={120}
          maxHeight={320}
          disabled={busy || aiRewrite}
        />
        <div className="flex items-center gap-2">
          <span className="type-meta text-muted-foreground">
            {script === null && referenceScript ? "The reference's words — rewrite them for your product" : `${scriptText.split(/\s+/).filter(Boolean).length} words`}
          </span>
          {script !== null && referenceScript ? (
            <Button variant="quiet" className="ml-auto" onClick={() => setScript(null)}>
              Reset to reference
            </Button>
          ) : null}
        </div>
      </Row>

      {presenter === "own_footage" ? (
        <Row label="Your recordings">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" icon={<Play />} disabled={busy || !scriptText} onClick={() => void showLines()}>
                Show my lines
              </Button>
              <FilePickButton accept="video/*" multiple icon={<Upload />} disabled={busy} onFiles={(f) => void upload(f, "take")}>
                Upload recordings
              </FilePickButton>
              {uploading === "take" ? <span className="type-meta text-muted-foreground">Uploading…</span> : null}
            </div>
            {teleprompter ? (
              <ol className="flex flex-col gap-2 rounded-lg border border-border p-2">
                {teleprompter.teleprompter.map((b, i) => (
                  <li key={`${b.beat}-${i}`} className="flex flex-col gap-0.5">
                    <span className="type-meta text-muted-foreground">{`Take ${i + 1} · ${b.role}`}</span>
                    {b.lines.map((l, j) => (
                      <span key={j} className="type-body text-foreground">
                        {l}
                      </span>
                    ))}
                  </li>
                ))}
              </ol>
            ) : null}
            {takes.length ? (
              <ul className="flex flex-col gap-1">
                {takes.map((t, i) => (
                  <li key={t.file.fileId} className="flex items-center gap-2 type-meta text-foreground">
                    <Badge>{`Take ${i + 1}`}</Badge>
                    <span className="truncate">{t.name}</span>
                    {t.file.durationSeconds ? <span className="text-muted-foreground">{t.file.durationSeconds.toFixed(1)}s</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="type-meta text-muted-foreground">Read each take's lines on camera, then upload them in order</span>
            )}
          </div>
        </Row>
      ) : null}

      <Row label="Hook line">
        <Field
          placeholder={structure.data?.hook?.on_screen_text || "The reference's hook is kept"}
          value={hookValue}
          maxLength={120}
          onChange={(e) => {
            setHookLine(e.target.value);
            setHookTouched(true);
          }}
        />
        {hookValue.trim() === "" && keptBrand ? (
          <span className="type-meta text-warning">{`The reference's on-screen text names "${keptBrand}". Write your own hook line or it stays in your video.`}</span>
        ) : hookPrefilledFrom ? (
          <span className="type-meta text-muted-foreground">{`Swapped "${hookPrefilledFrom}" for your brand name. Edit it if it reads wrong.`}</span>
        ) : null}
      </Row>

      <Row label="Captions">
        <CaptionLookPicker
          value={captionLook}
          onChange={setCaptionLook}
          disabled={busy}
          extra={[
            { id: "match", label: "Match reference" },
            { id: "off", label: "No captions" },
          ]}
        />
      </Row>

      <Row label="Shape">
        <SegmentedControl aria-label="Shape" value={aspect} onValueChange={(v) => setAspect(v as CloneAspect)} data={ASPECTS} />
      </Row>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Button variant={plan ? "outline" : "primary"} icon={<Clapperboard />} disabled={!canPlan} onClick={() => void runPlan()}>
            {plan ? "Plan again" : "Plan"}
          </Button>
          {!structure.data ? <span className="type-meta text-muted-foreground">Analyze the reference first</span> : null}
          {ownFootageMissing ? <span className="type-meta text-muted-foreground">Upload your recordings first</span> : null}
          <span className="type-meta ml-auto text-muted-foreground">Planning is free</span>
        </div>
        <RunLog steps={steps} />
        {failure ? <FailureLine error={failure} operation="video clone" /> : null}
        {plan && est ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-label text-foreground">{`Plan saved · version ${plan.version}`}</span>
              <span className="ml-auto">
                <CostLine label={estimateLabel(summarizeEstimate(est))} usd={est.total_usd} pts={est.total_points} />
              </span>
            </div>
            {plan.script_source === "fallback" ? <span className="type-meta text-warning">Kept the reference script</span> : null}
            {writerSkipped ? <span className="type-meta text-warning">The script writer didn't run, so the reference script was kept</span> : null}
            {notes.length ? (
              <ul className="flex flex-col gap-0.5">
                {notes.map((n, i) => (
                  <li key={`${n.code}-${i}`} className="type-meta text-muted-foreground">
                    {n.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {est.unsupported.length ? (
              <span className="type-meta text-destructive">{`${est.unsupported.length} item(s) have no model: ${est.unsupported[0]?.reason ?? ""}`}</span>
            ) : null}
            <div className="flex items-center gap-2">
              {phase === "confirm" ? (
                <>
                  <span className="type-body text-foreground">Over your confirmation setting</span>
                  <Button variant="primary" className="ml-auto" onClick={() => void generate(true)}>
                    {`Generate for ${points(est.total_points)}`}
                  </Button>
                  <Button variant="quiet" onClick={() => setPhase("planned")}>
                    Not now
                  </Button>
                </>
              ) : (
                <>
                  {phase === "generating" && spent > 0 ? <span className="type-meta text-muted-foreground">{`Spent so far ${dollars(spent)}`}</span> : null}
                  <Button variant="primary" className="ml-auto" disabled={phase === "generating"} onClick={() => void generate(false)}>
                    Generate
                  </Button>
                  <Button asChild variant="quiet">
                    <Link href={`${base}/${plan.project_id}`}>Open project</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Row({ label, end, children }: { label: string; end?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="type-label text-foreground">{label}</span>
        {end ? <span className="ml-auto">{end}</span> : null}
      </div>
      {children}
    </div>
  );
}

function FilePickButton({
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
