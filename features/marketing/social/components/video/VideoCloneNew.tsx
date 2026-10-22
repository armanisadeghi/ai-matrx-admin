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

import { CostDoor } from "@/components/cost/CostDoor";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { getFile } from "@/features/files/api/files";
import { fileIdToMediaRef } from "@/features/files/redux/converters";
import { useSubjectPhotos } from "@/features/marketing/photos/SubjectPhotosDialog";
import { ReferencePlayer } from "./ReferencePlayer";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Film, ImagePlus, Mic, Play, ScanSearch, Upload, UserRound, Video, PenLine } from "lucide-react";

import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { Badge, Button, EmptyState, Field, RegionSkeleton, SegmentedControl, Select } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { toast } from "@/lib/toast";
import { ShimmerText } from "@ai-matrx/design-system";
import { currentPathWithSearch, replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { cn } from "@/lib/utils";

import {
  analyzeReference,
  VideoStreamError,
  fetchTeleprompter,
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
import { useReferencePost, useRunningAnalysis, useVideoStructure, videoKeys } from "../../video/hooks";
import { attachReferenceVideo, createVideoProject, deleteVideoProject, estimateProject, fetchPostWords, getVideoProject } from "../../video/server";
import { contentHashOf, useBrandOfferings, useFileUrls, useOfferingFacts, useReferenceVideo, useScriptWriterReady } from "../../video/studio-hooks";
import { useSocials } from "../SocialsContext";
import { parseBriefDraft, serializeBriefDraft } from "../../video/brief-draft";
import { brandNameIn, hookPrefill as hookPrefillFor } from "../../video/hook-brand";
import { cutText, joinOverlayLines, nameFromCaption } from "../../video/text";
import { useExpiredSessionGuard } from "../../video/session";
import { uploadBriefFile } from "../../video/upload";
import { confirmLine, estimateLabel, summarizeEstimate } from "../../video/estimate";
import { plainRenderMessage } from "../../video/render-errors";
import { MusicPicker } from "./MusicPicker";
import { NO_MUSIC, musicCostLine, musicForBrief, type MusicChoice } from "../../video/music";
import { CaptionLookPicker, CostLine, FailureLine, FilePickButton, RunLog, closeSteps, pushStep, type RunStep } from "./StudioParts";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

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

export function VideoCloneNew() {
  const params = useSearchParams();
  useExpiredSessionGuard();
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
      </div>
      <CloneWorkspace postId={postId} projectId={projectId} onProject={setProjectId} wantVariants={wantVariants} base={base} />
    </div>
  );
}

/**
 * The reference + brief panels, address-free: a Board tile mounts this with the post it names; the page above adds
 * its header. `onFinished` replaces the page's move to the project page (the tile swaps itself to the studio).
 */
export function CloneWorkspace({
  postId,
  projectId,
  onProject,
  wantVariants = false,
  base,
  onFinished,
  draft,
  onDraft,
}: {
  postId: string;
  projectId: string | null;
  onProject: (id: string) => void;
  wantVariants?: boolean;
  base: string;
  onFinished?: (projectId: string) => void;
  /** A saved brief (JSON) to start from, and where each change goes (a Board tile keeps it across reloads). */
  draft?: string | null;
  onDraft?: (json: string) => void;
}) {
  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ReferencePanel postId={postId} />
      <BriefPanel postId={postId} projectId={projectId} onProject={onProject} wantVariants={wantVariants} base={base} onFinished={onFinished} draft={draft} onDraft={onDraft} />
    </div>
  );
}

// ── the reference ───────────────────────────────────────────────────────────────────────────────────

function ReferencePanel({ postId }: { postId: string }) {
  const { organizationId } = useSocials();
  const queryClient = useQueryClient();
  const post = useReferencePost(postId);
  const structure = useVideoStructure(postId);
  // Just after Analyze the clip may still be landing: ask again every few seconds (bounded) instead of showing "none".
  const [settling, setSettling] = useState(false);
  const video = useReferenceVideo(postId, settling);
  const { facts } = useFileUrls(video.data ? [video.data.file_id] : []);
  const url = video.data ? facts[video.data.file_id]?.url : null;
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [busy, setBusy] = useState(false);
  // The platform refused the download: the person's own file of that video carries on from here.
  const [refused, setRefused] = useState(false);
  // A reload mid-analysis loses this page's stream, not the server's run: ask the runtime whether one is still going.
  const serverRunning = useRunningAnalysis(postId, !busy && !structure.data);
  const uploadReference = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    setSteps([{ id: "ref-upload", label: "Uploading your file", state: "running" }]);
    try {
      const made = await uploadBriefFile(f, "Video/References");
      await attachReferenceVideo(postId, made.fileId, { organizationId });
      setRefused(false);
      setBusy(false);
      await queryClient.invalidateQueries({ queryKey: ["marketing", "social", "video", "post-media", postId] });
      await analyze();
    } catch (err) {
      setSteps([{ id: "err", label: err instanceof Error ? err.message : "That upload didn't work", state: "failed" }]);
      setBusy(false);
    }
  };

  const analyze = async () => {
    setRefused(false);
    setBusy(true);
    setSteps([{ id: "start", label: "Starting analysis", state: "running" }]);
    try {
      const result = await analyzeReference(postId, { organizationId }, (s) =>
        setSteps((prev) => pushStep(prev, { id: s.stage || s.label, label: s.label, state: "running", meta: s.total ? `${s.current}/${s.total}` : undefined })),
      );
      setSteps((prev) => closeSteps(prev));
      setSettling(true);
      window.setTimeout(() => setSettling(false), 90_000);
      // Analysis lands the post's video and its words too: re-read all three.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: videoKeys.post(postId) }),
        queryClient.invalidateQueries({ queryKey: ["marketing", "social", "video", "post-media", postId] }),
      ]);
    } catch (err) {
      setRefused(err instanceof VideoStreamError && (err.code === "download_refused" || /upload the video file/i.test(err.message)));
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
          <OutboundLink href={post.data.url} className="type-meta ml-auto text-muted-foreground underline">
            Original
          </OutboundLink>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: "9 / 16" }}>
        {url ? (
          <ReferencePlayer src={url} className="h-full w-full outline-none" />
        ) : video.isPending || (settling && !video.data) ? (
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
      ) : !s && serverRunning && !busy ? (
        <div className="flex items-center gap-2" role="status">
          <ShimmerText text="Analyzing the video" />
          <span className="type-meta text-muted-foreground">Still running; the result appears here when it finishes.</span>
        </div>
      ) : !s ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="type-body text-muted-foreground">Not analyzed yet</span>
            <Button variant="primary" icon={<ScanSearch />} className="ml-auto" disabled={busy} onClick={() => void analyze()}>
              Analyze
            </Button>
          </div>
          {refused ? (
            <div className="flex flex-wrap items-center gap-2">
              <FilePickButton accept="video/*" icon={<Upload />} disabled={busy} onFiles={(f) => void uploadReference(f)}>
                Upload the video file
              </FilePickButton>
              <span className="type-meta text-muted-foreground">Then it is analyzed from your file</span>
            </div>
          ) : null}
          <RunLog steps={steps} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <RunLog steps={steps} />
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
  onFinished,
  draft,
  onDraft,
}: {
  postId: string;
  projectId: string | null;
  onProject: (id: string) => void;
  wantVariants: boolean;
  base: string;
  onFinished?: (projectId: string) => void;
  draft?: string | null;
  onDraft?: (json: string) => void;
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
    // Right after Analyze the video may not be stored yet: that answer is asked again until the words arrive (a clip with
    // no speech is a final answer), so the script fills in without a reload.
    staleTime: (q) => (q.state.data && q.state.data.status !== "no_stored_video" && q.state.data.status !== "words_unavailable" ? Infinity : 0),
    refetchInterval: (q) => (q.state.data?.status === "no_stored_video" || q.state.data?.status === "words_unavailable" ? 3000 : false),
    retry: 3,
  });

  const [saved] = useState(() => parseBriefDraft(draft));
  const [productKey, setProductKey] = useState<string>(saved.productKey ?? "");
  const [productName, setProductName] = useState(saved.productName ?? "");
  const [productImage, setProductImage] = useState<BriefFile | null>((saved.productImage as BriefFile | undefined) ?? null);
  const [aboutText, setAboutText] = useState<string | null>(saved.aboutText ?? null);
  const [priceText, setPriceText] = useState<string | null>(saved.priceText ?? null);
  const [presenter, setPresenter] = useState<PresenterMode>((saved.presenter as PresenterMode | undefined) ?? "voiceover");
  const [presenterText, setPresenterText] = useState(saved.presenterText ?? "");
  // A project made by this page (the lines preview or Plan) and not yet planned: removed again if the person leaves or the plan fails.
  const madeHere = useRef<string | null>(null);
  const [script, setScript] = useState<string | null>(saved.script ?? null);
  const [hookLine, setHookLine] = useState(saved.hookLine ?? "");
  const [hookTouched, setHookTouched] = useState(saved.hookTouched ?? false);
  const [aiRewrite, setAiRewrite] = useState(saved.aiRewrite ?? false);
  const scriptWriterReady = useScriptWriterReady();
  const [captionLook, setCaptionLook] = useState<string>(saved.captionLook ?? "match");
  const [aspect, setAspect] = useState<CloneAspect>((saved.aspect as CloneAspect | undefined) ?? "9:16");
  const [takes, setTakes] = useState<Array<{ name: string; file: BriefFile }>>((saved.takes as Array<{ name: string; file: BriefFile }> | undefined) ?? []);
  const [teleprompter, setTeleprompter] = useState<TeleprompterAnswer | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [music, setMusic] = useState<MusicChoice>(saved.music ?? NO_MUSIC);

  // Every change to the brief is handed to the host (a Board tile saves it) after a short pause.
  const draftJson = serializeBriefDraft({ productKey, productName, productImage, aboutText, priceText, presenter, presenterText, script, hookLine, hookTouched, aiRewrite, captionLook, aspect, takes, music });
  const [lastDraft] = useState(() => ({ json: draftJson }));
  useEffect(() => {
    if (!onDraft || draftJson === lastDraft.json) return;
    const t = setTimeout(() => {
      lastDraft.json = draftJson;
      onDraft(draftJson);
    }, 800);
    return () => clearTimeout(t);
  }, [draftJson, onDraft, lastDraft]);

  const [phase, setPhase] = useState<Phase>("brief");
  const [resuming, setResuming] = useState(false);
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [plan, setPlan] = useState<ClonePlanResult | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  // The reference's on-screen text that stays when no hook line is typed: warn when it names a business.
  const keptTexts = [structure.data?.hook?.on_screen_text, ...(structure.data?.onScreenText.map((t) => t.text) ?? [])].filter((t): t is string => Boolean(t));
  const keptBrand = keptTexts.map((t) => brandNameIn(t, brand.name)).find(Boolean) ?? null;
  const hookSource = structure.data?.hook?.on_screen_text ?? "";
  // The field shows the reference hook with the other business's name swapped for this brand until the person types.
  // Only a certain, readable swap is prefilled; anything else leaves the field empty and the warning below does the talking.
  const prefill = hookPrefillFor(hookSource, brand.name);
  const hookPrefill = prefill.text;
  const hookValue = hookTouched ? hookLine : hookPrefill;
  const hookPrefilledFrom = !hookTouched && hookPrefill ? prefill.swapped : null;

  const referenceScript = (words.data?.words ?? []).map((w) => w.text).join(" ").trim();
  const scriptText = script ?? referenceScript;
  const noSpeech = words.data?.status === "no_speech";
  const offering = offerings.data?.find((o) => o.key === productKey) ?? null;
  // The offering's saved photos (brand library): all are used unless the person unticks some; an uploaded photo wins.
  const offeringPhotos = useSubjectPhotos(
    { brandId, organizationId, kind: "offering", id: offering?.offeringId ?? "" },
    Boolean(offering?.offeringId),
  ).data ?? [];
  const [droppedPhotos, setDroppedPhotos] = useState<string[]>([]);
  const keptPhotos = offeringPhotos.filter((p) => !droppedPhotos.includes(p.fileId));
  const keptKey = keptPhotos.map((p) => p.fileId).join(",");
  const [pickedFiles, setPickedFiles] = useState<{ key: string; files: BriefFile[] } | null>(null);
  useEffect(() => {
    if (!offering?.offeringId || droppedPhotos.length === 0 || keptPhotos.length === 0) return;
    let live = true;
    void Promise.all(
      keptPhotos.map(async (p) => {
        const { data } = await getFile(p.fileId);
        const hash = contentHashOf(data.checksum);
        return hash ? ({ fileId: p.fileId, contentHash: hash } as BriefFile) : null;
      }),
    ).then((files) => {
      if (live) setPickedFiles({ key: keptKey, files: files.filter((f): f is BriefFile => f !== null) });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keptKey, droppedPhotos.length, offering?.offeringId]);
  const chosenPhotoFiles =
    droppedPhotos.length > 0 && pickedFiles?.key === keptKey && pickedFiles.files.length ? pickedFiles.files.slice(0, 4) : null;
  const product = offering ? offering.name : productName.trim();
  // The saved details of the chosen product start the two labels; typing replaces them. Nothing typed = the saved text.
  const facts = useOfferingFacts(offering?.offeringId ?? null);
  const aboutValue = aboutText ?? facts?.description ?? "";
  const priceValue = priceText ?? facts?.price ?? offering?.priceText ?? "";
  const busy = phase === "planning" || phase === "generating" || uploading !== null;

  // A reload of `...&project=<id>` brings back the saved plan: its version, its price and the Generate / Open project actions.
  const resumeFor = useRef(projectId);
  useEffect(() => {
    const pid = resumeFor.current;
    if (!pid || !organizationId) return;
    let alive = true;
    setResuming(true);
    void (async () => {
      try {
        const answer = await getVideoProject(pid, { organizationId });
        if (!answer.composition || !alive) return;
        const estimate = await estimateProject(pid, null, { organizationId });
        if (!alive) return;
        setPlan((prev) => prev ?? {
          project_id: pid,
          version: answer.head_version,
          analysis_id: "",
          post_id: postId,
          script_source: "kept",
          script_agent: "not_requested",
          report: { notes: [] },
          estimate: estimate as ClonePlanResult["estimate"],
        });
        setPhase((p) => (p === "brief" ? "planned" : p));
      } catch {
        // No saved plan to bring back: the brief stays as it is, and Plan starts a new one.
      } finally {
        if (alive) setResuming(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [organizationId, postId]);

  const ensureProject = async (): Promise<string> => {
    if (projectId) return projectId;
    const caption = nameFromCaption(post.data?.caption, 40);
    const name = `${cutText(product || brand.name, 60)} · ${caption || "clone"}`;
    const made = await createVideoProject({ post_id: postId, name, brand_id: brandId }, { organizationId });
    madeHere.current = made.project_id;
    onProject(made.project_id);
    if (!onFinished) {
      const next = new URLSearchParams(window.location.search);
      next.set("project", made.project_id);
      replaceAddressWithoutNavigating(currentPathWithSearch(next));
    }
    void queryClient.invalidateQueries({ queryKey: videoKeys.all });
    return made.project_id;
  };

  // A plan that failed (or a lines preview the person walked away from) leaves no empty project behind.
  const discardUnplanned = async () => {
    const pid = madeHere.current;
    if (!pid) return;
    madeHere.current = null;
    try {
      await deleteVideoProject(pid, { organizationId });
    } catch {
      // The project stays listed (with a Delete button there); nothing else depends on it.
    }
    onProject("");
    if (!onFinished) {
      const next = new URLSearchParams(window.location.search);
      next.delete("project");
      replaceAddressWithoutNavigating(currentPathWithSearch(next));
    }
    void queryClient.invalidateQueries({ queryKey: videoKeys.all });
  };
  const discardRef = useRef(discardUnplanned);
  useEffect(() => {
    discardRef.current = discardUnplanned;
  });
  useEffect(() => () => void discardRef.current(), []);

  const brief = (): ServerCloneBrief => ({
    brand: { id: brandId, name: brand.name },
    ...(product
      ? {
          product: {
            name: cutText(product, 60),
            ...(offering?.offeringId ? { offeringId: offering.offeringId } : {}),
            ...(aboutValue.trim() ? { description: cutText(aboutValue.trim(), 600) } : {}),
            ...(priceValue.trim() ? { price: cutText(priceValue.trim(), 60) } : {}),
            ...(productImage ? { images: [productImage] } : chosenPhotoFiles ? { images: chosenPhotoFiles } : {}),
          },
        }
      : {}),
    presenter: {
      mode: presenter,
      ...(presenter === "generated_presenter" && presenterText.trim() ? { prompt: cutText(presenterText.trim(), 400) } : {}),
      ...(presenter === "own_footage" ? { takes: takes.map((t) => ({ file: t.file })) } : {}),
    },
    script: aiRewrite ? { mode: "rewrite" } : scriptText ? { mode: "rewrite", text: scriptText } : { mode: "keep" },
    ...(hookValue.trim() ? { hookLine: cutText(hookValue.trim(), 120) } : {}),
    captions: captionLook === "match" ? { mode: "match" } : captionLook === "off" ? { mode: "off" } : { mode: "preset", preset: captionLook },
    aspect,
    ...(musicForBrief(music) ? { music: musicForBrief(music) } : {}),
  });

  const showLines = async () => {
    try {
      const pid = await ensureProject();
      // AI rewrite chosen and nothing typed: the server writes the script and these are its lines; the page then keeps that
      // script as the person's own so the plan uses exactly what they record.
      const typed = !aiRewrite || script !== null;
      const answer = await fetchTeleprompter(
        pid,
        { brief: { ...brief(), presenter: { mode: "voiceover" }, script: typed ? { mode: "rewrite", text: scriptText } : { mode: "rewrite" } }, post_id: postId },
        { organizationId },
      );
      setTeleprompter(answer);
      if (answer.script) {
        setScript(answer.script);
        setAiRewrite(false);
      }
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
    let pid: string | null = null;
    try {
      pid = await ensureProject();
      const result = await runClonePlan(pid, { brief: brief(), post_id: postId }, { organizationId }, (s) =>
        setSteps((prev) => pushStep(prev, { id: s.stage || s.label, label: s.label, state: "running" })),
      );
      setSteps((prev) => closeSteps(prev));
      madeHere.current = null;
      setPlan(result);
      setPhase("planned");
      void queryClient.invalidateQueries({ queryKey: videoKeys.project(pid) });
    } catch (err) {
      setSteps((prev) => closeSteps(prev, "failed"));
      setFailure(err);
      setPhase("brief");
      await discardUnplanned();
    }
  };

  const generate = async (confirmed: boolean) => {
    if (!plan) return;
    setFailure(null);
    setPhase("generating");
    setSteps([{ id: "price", label: "Pricing", state: "running" }]);
    let needsConfirm = false;
    let errored: string | null = null;
    const onEvent = (e: LineEvent) => {
      const media = typeof e.media_id === "string" ? e.media_id : "";
      switch (e.type) {
        case "estimate":
          setSteps((p) => pushStep(p, { id: "price", label: "Checked what is left to make", state: "done" }));
          break;
        case "confirmation_required":
          needsConfirm = true;
          break;
        case "generating":
          setSteps((p) => pushStep(p, { id: media, label: `Making ${mediaLabel(media)}`, state: "running" }));
          break;
        case "cache_hit":
          setSteps((p) => pushStep(p, { id: media, label: `${mediaLabel(media)} reused`, state: "done" }));
          break;
        case "generated":
          setSteps((p) => p.map((s) => (s.id === media ? { ...s, label: `${mediaLabel(media)} made`, state: "done" } : s)));
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
      if (onFinished) onFinished(plan.project_id);
      else router.push(`${base}/${plan.project_id}${wantVariants ? "?variants=3" : ""}`);
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
          {offerings.isPending || (offerings.data?.length ?? 0) > 0 ? (
          <Select
            aria-label="Product"
            value={productKey}
            onValueChange={(v) => {
              setProductKey(v);
              setDroppedPhotos([]);
              setAboutText(null);
              setPriceText(null);
            }}
            options={[
              { value: "", label: offerings.isPending ? "Loading products…" : "Name it myself" },
              ...(offerings.data ?? []).map((o) => ({ value: o.key, label: o.name })),
            ]}
          />
          ) : null}
          {!offering ? (
            <Field placeholder="Product name" value={productName} maxLength={60} onChange={(e) => setProductName(e.target.value)} />
          ) : null}
          <Field
            aria-label="About the product"
            placeholder="About the product"
            value={aboutValue}
            maxLength={600}
            disabled={busy}
            onChange={(e) => setAboutText(e.target.value)}
          />
          <Field aria-label="Price" placeholder="Price" value={priceValue} maxLength={60} disabled={busy} onChange={(e) => setPriceText(e.target.value)} />
          {offeringPhotos.length > 0 && !productImage ? (
            <div className="flex flex-wrap items-center gap-2" data-offering-photo-picker>
              {offeringPhotos.map((p, i) => {
                const on = !droppedPhotos.includes(p.fileId);
                return (
                  <button
                    key={p.fileId}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${on ? "Use" : "Skip"} photo ${i + 1}`}
                    disabled={busy || (on && keptPhotos.length === 1)}
                    onClick={() => setDroppedPhotos((d) => (on ? [...d, p.fileId] : d.filter((x) => x !== p.fileId)))}
                    className={`relative size-14 overflow-hidden rounded-md border ${on ? "border-primary" : "border-border opacity-40"}`}
                  >
                    <InlineMediaRef ref={fileIdToMediaRef(p.fileId)} size="fill" fit="cover" rounded="none" fallback="icon" errorFallback="icon" alt="" className="absolute inset-0 h-full w-full" />
                  </button>
                );
              })}
              <span className="type-meta text-muted-foreground">Photos from {offering?.name}. Tap to skip one</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <FilePickButton accept="image/*" icon={<ImagePlus />} disabled={busy} onFiles={(f) => void upload(f, "product")}>
              {productImage ? "Replace photo" : "Product photo"}
            </FilePickButton>
            {uploading === "product" ? <span className="type-meta text-muted-foreground">Uploading…</span> : null}
            {productImage ? <Badge tone="success">Photo added</Badge> : offeringPhotos.length ? null : <span className="type-meta text-muted-foreground">None: one is generated</span>}
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
        {presenter === "generated_presenter" ? (
          <>
            <Field
              aria-label="Who is the presenter"
              placeholder="Who is on camera, e.g. a friendly woman in her 30s in a bright kitchen"
              value={presenterText}
              maxLength={400}
              disabled={busy}
              onChange={(e) => setPresenterText(e.target.value)}
            />
            <span className="type-meta text-muted-foreground">{`Empty uses ${brand.name}'s spokesperson photos when it has them`}</span>
          </>
        ) : null}
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
        {noSpeech ? (
          <span className="type-meta text-warning">
            {aiRewrite
              ? "This reference has no speech. The AI writes your script from its on-screen text, its shots and your brief when you press Plan"
              : "This reference has no speech. Press AI rewrite to have the script written from its on-screen text and shots, or write it yourself"}
          </span>
        ) : aiRewrite ? (
          <span className="type-meta text-muted-foreground">The script is written for your product when you press Plan</span>
        ) : null}
        <ProTextarea
          value={scriptText}
          onChange={(e) => setScript(e.target.value)}
          placeholder={words.isPending && structure.data ? "Loading the reference script…" : words.data?.status === "no_stored_video" || words.data?.status === "words_unavailable" ? "Getting the reference script…" : "Write what the video says"}
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
              <Button variant="outline" icon={<Play />} disabled={busy || (!scriptText && !aiRewrite)} onClick={() => void showLines()}>
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
            {takes.length === 1 && teleprompter && teleprompter.teleprompter.length > 1 ? (
              <span className="type-meta text-muted-foreground">One recording covers every line: read them straight through. Your captions and cuts follow what you actually said.</span>
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
          placeholder={joinOverlayLines(structure.data?.hook?.on_screen_text) || "The reference's hook is kept"}
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

      <Row label="Music">
        <MusicPicker value={music} onChange={setMusic} disabled={busy} />
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
        </div>
        {resuming ? <span className="type-meta text-muted-foreground">Loading your saved plan…</span> : null}
        <RunLog steps={steps} />
        {failure ? <FailureLine error={failure} operation="video clone" /> : null}
        {plan && est ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-label text-foreground">{`Plan saved · version ${plan.version}`}</span>
              <span className="ml-auto">
                <CostLine label={estimateLabel(summarizeEstimate(est))} pts={est.total_points} />
              </span>
            </div>
            {musicCostLine(est) ? <span className="type-meta text-muted-foreground">{musicCostLine(est)}</span> : null}
            {confirmLine(est) ? <span className="type-meta text-muted-foreground">{confirmLine(est)}</span> : null}
            {plan.script_source === "fallback" ? <span className="type-meta text-warning">Kept the reference script</span> : null}
            {writerSkipped ? <span className="type-meta text-warning">The script writer didn't run, so the reference script was kept</span> : null}
            {plan.brand_facts && plan.brand_facts.facts ? (
              <span className="type-meta text-muted-foreground">
                {`From ${brand.name}: ${plan.brand_facts.facts} facts${plan.brand_facts.has_voice ? ", its voice" : ""}${plan.brand_facts.product_images ? ", the product photo" : ""}${plan.brand_facts.spokesperson_images ? ", the spokesperson" : ""}`}
              </span>
            ) : null}
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
                  <CostDoor points={est.total_points} />
                  <Button variant="primary" className="ml-auto" onClick={() => void generate(true)}>
                    Generate
                  </Button>
                  <Button variant="quiet" onClick={() => setPhase("planned")}>
                    Not now
                  </Button>
                </>
              ) : (
                <>
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
