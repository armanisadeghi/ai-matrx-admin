"use client";

/**
 * Socials → Videos → New video: a video with no reference post. Step one is the format gallery (each format played
 * live by the engine on the server's sample brief); step two is the brief for the chosen format (`?format=<id>`);
 * Plan makes the project and plans it from the brief (the script writer writes the words unless you do), Generate
 * makes the pictures and voice, and the same studio takes it from there (preview, render, variants, download).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clapperboard, Film, Mic, UserRound } from "lucide-react";

import { programInputFromComposition, loadVideoFonts } from "@ai-matrx/media/video/engine";
import { resolveComposition, type Composition } from "@ai-matrx/media/video";
import { VideoPlayer } from "@ai-matrx/media/video/react";
import { Badge, Button, EmptyState, Field, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { cn } from "@/lib/utils";

import { streamGenerate, type ClonePlanResult, type LineEvent, type PresenterMode, type ServerCloneBrief } from "../../video/clone";
import {
  fetchFormatPreview,
  listFormats,
  parseEmojiLines,
  parseLines,
  runFormatVideo,
  type FormatId,
  type FormatInfo,
  type FormatInputs,
} from "../../video/formats";
import { videoKeys } from "../../video/hooks";
import { plainRenderMessage } from "../../video/render-errors";
import { useSocials } from "../SocialsContext";
import { useExpiredSessionGuard } from "../../video/session";
import { MusicPicker } from "./MusicPicker";
import { NO_MUSIC, musicForBrief, type MusicChoice } from "../../video/music";
import { CostLine, FailureLine, RunLog, closeSteps, pushStep, type RunStep } from "./StudioParts";

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

/** A friendly name for a media id of a format plan. */
function mediaName(id: string): string {
  if (/^take-\d+/.test(id)) return `Voice ${Number(id.slice(5))}`;
  if (/^broll-\d+/.test(id)) return `Picture ${Number(id.slice(6)) + 1}`;
  if (id.startsWith("podcast-")) return id === "podcast-host" ? "Host photo" : "Guest photo";
  if (id.startsWith("product-")) return "Product photo";
  if (id === "presenter-portrait") return "Presenter portrait";
  return id;
}

// ── the format played by the engine ─────────────────────────────────────────────────────────────────

/** Muted gradient pairs painted where a picture would be (video content, not interface color). */
const STAND_IN_TONES: ReadonlyArray<readonly [string, string]> = [
  ["#2b3a55", "#52678f"],
  ["#3d2f4f", "#7a5a9e"],
  ["#2f4a45", "#5a9e8f"],
  ["#4f3a2f", "#9e7a5a"],
  ["#3a3a4f", "#6a6a9e"],
  ["#2f3f4f", "#5a8a9e"],
];

/** The preview's pictures are not made yet: each gets a soft stand-in so the layout, boards and captions read cleanly. */
function standInUrl(i: number): string {
  const [a, b] = STAND_IN_TONES[i % STAND_IN_TONES.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 160" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="90" height="160" fill="url(#g)"/><circle cx="45" cy="64" r="20" fill="#ffffff" fill-opacity="0.12"/><rect x="20" y="92" width="50" height="36" rx="8" fill="#ffffff" fill-opacity="0.08"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Plays the format from its first frame; `onLength` hands the true clip length (seconds) to the caller once the preview resolves. */
function FormatPlayer({ id, className, onLength }: { id: FormatId; className?: string; onLength?: (seconds: number) => void }) {
  useVideoFonts();
  const { organizationId } = useSocials();
  const preview = useQuery({
    queryKey: [...videoKeys.all, "format-preview", id],
    queryFn: () => fetchFormatPreview(id, { organizationId }),
    enabled: Boolean(organizationId),
    staleTime: 10 * 60_000,
  });
  const length = useMemo(() => {
    const doc = preview.data?.composition as unknown as Composition | undefined;
    const r = doc ? resolveComposition(doc) : null;
    return r?.ok ? r.timeline.frameCount / r.timeline.fps : null;
  }, [preview.data]);
  useEffect(() => {
    if (length != null) onLength?.(length);
  }, [length, onLength]);
  if (preview.isPending) return <div className={cn("animate-pulse rounded-lg bg-muted", className)} style={{ aspectRatio: "9 / 16" }} aria-label="Loading preview" />;
  if (preview.isError) return <ErrorAlchemyMenu error={preview.error} operation="load the format preview" />;
  const doc = preview.data.composition as unknown as Composition;
  const resolved = resolveComposition(doc);
  if (!resolved.ok) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg border border-border bg-muted", className)} style={{ aspectRatio: "9 / 16" }}>
        <EmptyState icon={<Film />} title="Preview unavailable" line={resolved.errors[0]?.message ?? ""} />
      </div>
    );
  }
  const mediaUrls: Record<string, string> = {};
  Object.entries(doc.media).forEach(([mid, m], i) => {
    if (m.kind === "image") mediaUrls[mid] = standInUrl(i);
  });
  return (
    <div className={className}>
      <VideoPlayer input={programInputFromComposition(doc, resolved.timeline)} mediaUrls={mediaUrls} hideTranscript />
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────────────────────────────

export function VideoFormatNew() {
  useExpiredSessionGuard();
  const params = useSearchParams();
  const formatId = params.get("format") as FormatId | null;
  const { brandSeg, organizationId } = useSocials();
  const base = `${marketingRoutes.brandSocials(brandSeg)}/videos`;
  const formats = useQuery({
    queryKey: [...videoKeys.all, "formats"],
    queryFn: () => listFormats({ organizationId }),
    enabled: Boolean(organizationId),
    staleTime: 10 * 60_000,
  });

  if (formats.isPending) return <RegionSkeleton shape="cards" count={6} aria-label="Loading formats" />;
  if (formats.isError) return <EmptyState icon={<Clapperboard />} title="Couldn't load formats" line={<ErrorAlchemyMenu error={formats.error} operation="load the formats" />} />;
  const chosen = formats.data.find((f) => f.id === formatId) ?? null;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button asChild variant="quiet" icon={<ArrowLeft />}>
          <Link href={chosen ? `${base}/formats` : base}>{chosen ? "Formats" : "Videos"}</Link>
        </Button>
        <span className="type-title text-foreground">{chosen ? chosen.label : "New video"}</span>
      </div>
      {chosen ? <FormatBrief key={chosen.id} info={chosen} base={base} /> : <Gallery formats={formats.data} base={base} />}
    </div>
  );
}

function GalleryCard({ f, base }: { f: FormatInfo; base: string }) {
  const [length, setLength] = useState<number | null>(null);
  // The player sits beside the link, never inside it: a button nested in an anchor navigates instead of playing.
  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card p-3">
      <FormatPlayer id={f.id} onLength={setLength} className="mx-auto w-full max-w-[15rem] overflow-hidden rounded-md" />
      <Link href={`${base}/formats?format=${f.id}`} data-clickable className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="type-label text-foreground">{f.label}</span>
          <span className="type-meta ml-auto text-muted-foreground">{length != null ? `${Math.round(length)}s` : `~${f.approxSeconds}s`}</span>
        </div>
        <span className="type-meta text-muted-foreground">{f.summary}</span>
        <div className="flex flex-wrap gap-1">
          {f.components.slice(0, 3).map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>
      </Link>
    </div>
  );
}

function Gallery({ formats, base }: { formats: FormatInfo[]; base: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {formats.map((f) => (
        <GalleryCard key={f.id} f={f} base={base} />
      ))}
    </div>
  );
}

// ── the brief ───────────────────────────────────────────────────────────────────────────────────────

type Phase = "brief" | "planning" | "planned" | "generating" | "confirm" | "done";

const PRESENTERS: ReadonlyArray<{ value: PresenterMode; label: string; icon: React.ReactNode }> = [
  { value: "voiceover", label: "Voiceover", icon: <Mic className="size-4" /> },
  { value: "generated_presenter", label: "AI presenter", icon: <UserRound className="size-4" /> },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-label text-foreground">{label}</span>
      {children}
    </div>
  );
}

function FormatBrief({ info, base }: { info: FormatInfo; base: string }) {
  const brand = useMarketingBrand();
  const { brandId, organizationId } = useSocials();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [productName, setProductName] = useState("");
  const [about, setAbout] = useState("");
  const [price, setPrice] = useState("");
  const [presenter, setPresenter] = useState<PresenterMode>("voiceover");
  const [presenterLook, setPresenterLook] = useState("");
  const [hookLine, setHookLine] = useState("");
  const [music, setMusic] = useState<MusicChoice>(NO_MUSIC);
  const [ownScript, setOwnScript] = useState(false);
  const [script, setScript] = useState("");
  const [text, setText] = useState<Record<string, string>>({});
  const [comment, setComment] = useState({ username: "", text: "" });
  const set = (k: string, v: string) => setText((p) => ({ ...p, [k]: v }));

  const [phase, setPhase] = useState<Phase>("brief");
  const [steps, setSteps] = useState<RunStep[]>([]);
  const [plan, setPlan] = useState<ClonePlanResult | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const busy = phase === "planning" || phase === "generating";
  const presenters = PRESENTERS.filter((p) => info.presenters.includes(p.value));

  const inputs = (): FormatInputs => {
    const out: FormatInputs = {};
    for (const spec of info.inputs) {
      const raw = text[spec.key] ?? "";
      if (spec.key === "items") out.items = parseEmojiLines(raw).map((i) => ({ label: i.label, ...(i.emoji ? { emoji: i.emoji } : {}) }));
      else if (spec.key === "answers") out.answers = parseEmojiLines(raw).map((i) => ({ ...(i.emoji ? { emoji: i.emoji } : {}), ...(i.label ? { label: i.label } : {}) }));
      else if (spec.key === "points") out.points = parseLines(raw);
      else if (spec.key === "question" && raw.trim()) out.question = raw.trim();
      else if (spec.key === "hostName" && raw.trim()) out.hostName = raw.trim();
      else if (spec.key === "guestName" && raw.trim()) out.guestName = raw.trim();
      else if (spec.key === "comment" && comment.username.trim() && comment.text.trim()) out.comment = { username: comment.username.trim(), text: comment.text.trim() };
    }
    return out;
  };

  const brief = (): ServerCloneBrief => {
    const topic = subject.trim() || productName.trim();
    return {
      brand: { id: brandId, name: brand.name },
      ...(topic ? { subject: topic } : {}),
      ...(productName.trim()
        ? { product: { name: productName.trim().slice(0, 60), ...(about.trim() ? { description: about.trim().slice(0, 600) } : {}), ...(price.trim() ? { price: price.trim().slice(0, 60) } : {}) } }
        : {}),
      presenter: { mode: presenter, ...(presenter === "generated_presenter" ? { prompt: presenterLook.trim() || "a friendly person in their thirties in a bright room" } : {}) },
      script: ownScript && script.trim() ? { mode: "rewrite", text: script.trim() } : { mode: "rewrite" },
      ...(hookLine.trim() ? { hookLine: hookLine.trim().slice(0, 120) } : {}),
      captions: { mode: "match" },
      ...(musicForBrief(music) ? { music: musicForBrief(music) } : {}),
    };
  };

  const missing = (): string | null => {
    if (!subject.trim() && !productName.trim()) return "Say what the video is about";
    if (info.needsProduct && !productName.trim()) return "Name the product";
    for (const spec of info.inputs) {
      if (!spec.required) continue;
      const raw = text[spec.key] ?? "";
      const n = spec.kind === "text" ? (raw.trim() ? 1 : 0) : parseLines(raw).length;
      if (n < (spec.min ?? 1)) return spec.min && spec.min > 1 ? `${spec.label}: at least ${spec.min}` : `${spec.label} is needed`;
    }
    return null;
  };

  const planIt = async () => {
    setFailure(null);
    setPhase("planning");
    setSteps([{ id: "start", label: "Starting", state: "running" }]);
    try {
      const result = await runFormatVideo(
        { format_id: info.id, brief: brief(), inputs: inputs(), brand_id: brandId, name: `${info.label}: ${(subject.trim() || productName.trim()).slice(0, 60)}` },
        { organizationId },
        (s) => setSteps((p) => pushStep(p, { id: s.stage || s.label, label: s.label, state: "running" })),
      );
      setSteps((p) => closeSteps(p));
      setPlan(result);
      setPhase("planned");
      void queryClient.invalidateQueries({ queryKey: videoKeys.all });
    } catch (err) {
      setSteps((p) => closeSteps(p, "failed"));
      setFailure(err);
      setPhase("brief");
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
          setSteps((p) => pushStep(p, { id: media, label: `Making ${mediaName(media)}`, state: "running" }));
          break;
        case "cache_hit":
          setSteps((p) => pushStep(p, { id: media, label: `${mediaName(media)} reused`, state: "done" }));
          break;
        case "generated":
          setSteps((p) => p.map((s) => (s.id === media ? { ...s, label: `${mediaName(media)} made`, state: "done" } : s)));
          break;
        case "warning":
          setSteps((p) => [...p, { id: `w${p.length}`, label: String(e.message ?? "Warning"), state: "failed" }]);
          break;
        case "applying":
          setSteps((p) => pushStep(p, { id: "apply", label: "Placing files and syncing captions", state: "running" }));
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
      router.push(`${base}/${plan.project_id}`);
    } catch (err) {
      setSteps((p) => closeSteps(p, "failed"));
      setFailure(err);
      setPhase("planned");
    }
  };

  const problem = missing();
  const est = plan?.estimate;
  const source: string = plan?.script_source ?? "";
  const notes = plan?.report.notes ?? [];
  const lines = plan?.report.teleprompter ?? [];
  const readyToPlan = !busy && !problem;

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
      <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-3">
        <FormatPlayer id={info.id} className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-md" />
        <span className="type-body text-foreground">{info.summary}</span>
        <ol className="flex flex-col gap-0.5">
          {info.beats.map((b, i) => (
            <li key={`${b.role}-${i}`} className="type-meta text-foreground">
              <span className="tabular-nums text-muted-foreground">{i + 1}</span> {b.role}
              <span className="text-muted-foreground"> — {b.summary}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-3">
        <Row label="About">
          <Field aria-label="What the video is about" placeholder="What the video is about" value={subject} maxLength={160} disabled={busy} onChange={(e) => setSubject(e.target.value)} />
        </Row>

        <Row label={info.needsProduct ? "Product" : "Product (optional)"}>
          <div className="flex flex-col gap-2">
            <Field aria-label="Product name" placeholder="Product name" value={productName} maxLength={60} disabled={busy} onChange={(e) => setProductName(e.target.value)} />
            <Field aria-label="About the product" placeholder="About the product" value={about} maxLength={600} disabled={busy} onChange={(e) => setAbout(e.target.value)} />
            <Field aria-label="Price" placeholder="Price" value={price} maxLength={60} disabled={busy} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </Row>

        {info.inputs.map((spec) => (
          <Row key={spec.key} label={spec.label}>
            {spec.kind === "comment" ? (
              <div className="flex flex-col gap-2">
                <Field aria-label="Comment from" placeholder="Username" value={comment.username} maxLength={40} disabled={busy} onChange={(e) => setComment((c) => ({ ...c, username: e.target.value }))} />
                <Field aria-label="Comment" placeholder="Comment" value={comment.text} maxLength={220} disabled={busy} onChange={(e) => setComment((c) => ({ ...c, text: e.target.value }))} />
              </div>
            ) : spec.kind === "text" ? (
              <Field aria-label={spec.label} placeholder={spec.placeholder} value={text[spec.key] ?? ""} maxLength={120} disabled={busy} onChange={(e) => set(spec.key, e.target.value)} />
            ) : (
              <ProTextarea
                value={text[spec.key] ?? ""}
                onChange={(e) => set(spec.key, e.target.value)}
                placeholder={spec.kind === "emoji-list" ? "One per line" : "One per line"}
                autoGrow
                minHeight={72}
                maxHeight={200}
                disabled={busy}
              />
            )}
          </Row>
        ))}

        {presenters.length > 1 ? (
          <Row label="Presenter">
            <SegmentedControl
              aria-label="Presenter"
              value={presenter}
              onValueChange={(v) => setPresenter(v as PresenterMode)}
              data={presenters.map((p) => ({ value: p.value, label: p.label }))}
            />
            {presenter === "generated_presenter" ? (
              <Field aria-label="Who presents" placeholder="Who presents" value={presenterLook} maxLength={200} disabled={busy} onChange={(e) => setPresenterLook(e.target.value)} />
            ) : null}
          </Row>
        ) : null}

        <Row label="Hook line (optional)">
          <Field aria-label="Hook line" placeholder="Opening card text" value={hookLine} maxLength={120} disabled={busy} onChange={(e) => setHookLine(e.target.value)} />
        </Row>

        <Row label="Music">
          <MusicPicker value={music} onChange={setMusic} disabled={busy} />
        </Row>

        <Row label="Script">
          <SegmentedControl
            aria-label="Script"
            value={ownScript ? "own" : "write"}
            onValueChange={(v) => setOwnScript(v === "own")}
            data={[
              { value: "write", label: "Write it for me" },
              { value: "own", label: "I wrote it" },
            ]}
          />
          {ownScript ? <ProTextarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Write what the video says" autoGrow minHeight={120} maxHeight={320} disabled={busy} /> : null}
        </Row>

        <div className="flex items-center gap-3">
          <Button variant="primary" disabled={!readyToPlan} onClick={() => void planIt()}>
            {phase === "planning" ? "Planning" : plan ? "Plan again" : "Plan video"}
          </Button>
          {problem && phase === "brief" ? <span className="type-meta text-muted-foreground">{problem}</span> : null}
        </div>

        <RunLog steps={steps} />
        {failure ? <FailureLine error={failure} operation="plan the video" /> : null}

        {plan ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={source === "template" ? "warning" : "success"}>{source === "agent" ? "Script written" : source === "person" ? "Your script" : "Draft script"}</Badge>
              {est ? <CostLine label="Estimate" pts={est.total_points} /> : null}
            </div>
            {notes.filter((n) => n.code !== "music-none").map((n) => (
              <span key={n.code} className="type-meta text-muted-foreground">{n.message}</span>
            ))}
            <div className="flex flex-col gap-1.5">
              {lines.map((b) => (
                <div key={b.beat} className="flex flex-col">
                  <span className="type-meta text-muted-foreground">{b.role}</span>
                  <span className="type-body text-foreground">{b.lines.join(" ")}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" disabled={busy} onClick={() => void generate(phase === "confirm")}>
                {phase === "confirm" ? "Confirm and generate" : phase === "generating" ? "Generating" : "Generate"}
              </Button>
              <Button asChild variant="quiet">
                <Link href={`${base}/${plan.project_id}`}>Open project</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
