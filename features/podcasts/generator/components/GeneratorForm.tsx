"use client";

// features/podcasts/generator/components/GeneratorForm.tsx
//
// The compose surface — the Podcast Studio centerpiece. It shows the full
// product vision: every source, language, format, host-count and processing
// option the platform intends to support. Wired pieces drive the real
// PodcastGenerateRequest; everything else is a ComingSoon placeholder that's
// visible now and trivial to wire later.
//
// Section order (top → bottom):
//   1. Source        ("What's your source?")  — topic / rough notes / full
//        script → typed text sent as input_data; "From your sources" → the one
//        Source input (upload, paste, web page, YouTube, recording, image, Use
//        existing), sent as a source_set the SERVER resolves (aidream
//        resolve_source_set) — nothing is read or cleaned in the browser.
//   2. Processing     (pre-script WIRED → post_prep_option; post-script ComingSoon)
//   3. Language       (Gemini 2.5 TTS locales — English + Persian live, rest Soon)
//   4. Format         (all wired via the multihost script agent) + theme
//   5. Hosts          (1–20 wired + optional per-host names & voices)
//   6. Show picker
//   7. Advanced       (extra instruction, show blurb, Test mode)
//
// Surface: this component mounts `matrx-user/podcast-studio` and is both its
// emitter (getSurfaceScope) and its write half (getSurfaceWriteHandlers) —
// agents can fill in the source text, the show shape, the audience, the prep
// steer, and the show blurb. Pressing Generate is NOT agent-writable.
//
// Request fields sent: input_data (typed words only) / source_set (+ edited_from
// when the person edited the Sources' text: the edit is its own Source), input_data_type, podcast_type
// (derived from Language + Format), language, format, theme, host_count,
// speakers (only when customized), post_prep_option, show_id,
// prep_user_message, first_show_info_text, truncate_audio_for_testing.

import { useState } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createPodcastStudioScope } from "@/features/surfaces/manifests/podcast-studio.manifest";
import {
  AudioLines,
  ChevronDown,
  SlidersHorizontal,
  FlaskConical,
  Languages,
  Users,
  Workflow,
  ArrowRight,
  UserCog,
  Images,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProTextarea } from "@/components/official/ProTextarea";
import { Input, SegmentedControl, Tile } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/coming-soon/ComingSoonBadge";
import { cn } from "@/lib/utils";
import { ShowPicker } from "./ShowPicker";
import {
  DEFAULT_FEATURE_IMAGE_STYLE,
  FEATURE_IMAGE_STYLES,
  toFeatureImageStyle,
  type FeatureImageStyleValue,
} from "../featureImageStyles";
import { SourceInput } from "@/features/resource-manager/source-input/components/SourceInput";
import { sourceSurfaceKey, useSourceSet } from "@/features/resource-manager/source-input/useSourceSet";
import { useResolvedSourceText } from "@/features/resource-manager/source-input/useResolvedSourceText";
import { ALL_SOURCE_KIND_IDS } from "@/features/resource-manager/source-input/sourceKinds";
import { landEditedSourceText } from "@/features/resource-manager/source-input/editedSourceText";
import { sourceRefusalSentence } from "@/features/sources/api/sourcesApi";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { TopicIdeaHelper } from "./TopicIdeaHelper";
import { topicIdeaOfferFacts } from "../topicIdeaOffer";
import {
  GENERATOR_SOURCE_OPTIONS,
  LANGUAGE_OPTIONS,
  DEFAULT_LANGUAGE,
  isRtlLanguage,
  deriveBackendPodcastType,
  FORMAT_OPTIONS,
  HOST_COUNT_OPTIONS,
  HOST_COUNT_DEFAULT,
  MAX_HOST_COUNT,
  PRE_SCRIPT_PROCESSING_OPTIONS,
  POST_SCRIPT_PROCESSING_OPTIONS,
} from "../constants";
import {
  castToSend,
  voicesForProvider,
  type SpeakerDraft,
} from "../voices";
import { useVoices } from "../useVoices";
import { OrganizationRequiredNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { usePodcastCastPreview } from "../usePodcastCastPreview";
import {
  getPodcastSourceReadiness,
  finishedScriptSpeakers,
  MIN_PODCAST_CONTENT_CHARS,
} from "../sourceReadiness";
import { SpeakerCastEditor } from "./SpeakerCastEditor";
import type {
  PodcastGenerateRequest,
  PodcastPostPrepOption,
  PodcastSourceKind,
  PodcastLanguageCode,
  PodcastFormat,
} from "../types";
import type { PcShow } from "@/features/podcasts/types";
import { DictionaryIndicatorButton } from "@/features/dictionary/components/DictionaryIndicatorButton";
import { useDictionaryContext } from "@/features/dictionary/hooks/useDictionaryContext";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

/** The one Source input's key on this surface — picks persist (and survive a reload) under it. */
const PODCAST_SOURCES_SURFACE = "podcasts:create";
/** Every Add new tile but Topic (the topic is its own tile here), plus Use existing. */
const PODCAST_SOURCE_KINDS = ALL_SOURCE_KIND_IDS.filter((k) => k !== "topic");
/** The script writer needs the text up front — never "let the AI look it up". */
const PODCAST_SOURCE_DELIVERIES = ["direct"] as const;

/** Surface key the podcast studio persists its dictionary selection under. */
const PODCAST_DICTIONARY_SURFACE = "matrx-user/podcast-studio";

interface GeneratorFormProps {
  shows: PcShow[];
  onShowCreated: (show: PcShow) => void;
  /** Resolve `false` when the run did not start — the picked Sources are then kept. */
  onGenerate: (body: PodcastGenerateRequest) => void | Promise<boolean | void>;
  busy: boolean;
  initialTopic?: string;
  initialFormat?: PodcastFormat;
  initialAgentLabel?: string;
  /** Free-text request carried from an entryway composer → seeds prep_user_message. */
  initialInstructions?: string;
}

const SECTION_LABEL =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** Per-media-type generation limit. `all` = full set, `one` = a single asset,
 *  `skip` = none. Maps to the backend's `max_images` / `max_videos` integer cap. */
type MediaLimitMode = "all" | "one" | "skip";

const MEDIA_LIMIT_MODES: { value: MediaLimitMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "one", label: "One" },
  { value: "skip", label: "Skip" },
];

/** Map a media-limit mode to the server cap. `all` returns undefined so the
 *  field is omitted and the server keeps its full default count. */
function mediaModeToCap(mode: MediaLimitMode): number | undefined {
  if (mode === "one") return 1;
  if (mode === "skip") return 0;
  return undefined;
}

/** One labeled row with an All · One · Skip segmented control. */
function MediaLimitField({
  icon: Icon,
  label,
  help,
  value,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  help: string;
  value: MediaLimitMode;
  onChange: (next: MediaLimitMode) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          <p className="text-xs text-muted-foreground">{help}</p>
        </div>
      </div>
      <SegmentedControl
        aria-label={`${label} count`}
        className="shrink-0"
        value={value}
        onValueChange={onChange}
        data={MEDIA_LIMIT_MODES}
      />
    </div>
  );
}

export function GeneratorForm({
  shows,
  onShowCreated,
  onGenerate,
  busy,
  initialTopic = "",
  initialFormat = "educational",
  initialAgentLabel,
  initialInstructions,
}: GeneratorFormProps) {
  const [sourceKind, setSourceKind] = useState<PodcastSourceKind>("topic");
  const [text, setText] = useState(initialTopic);
  // The one Source input's picks (pointers only; read on the server at Generate).
  const sourceSet = useSourceSet(PODCAST_SOURCES_SURFACE);
  const store = useAppStore();
  const userId = useAppSelector(selectUserId);
  /** True while an edited source text is being saved as its own Source. */
  const [savingEdit, setSavingEdit] = useState(false);
  const [language, setLanguage] = useState<PodcastLanguageCode>(DEFAULT_LANGUAGE);
  const [format, setFormat] = useState<PodcastFormat>(initialFormat);
  const [theme, setTheme] = useState("");
  const [hostCount, setHostCount] = useState(HOST_COUNT_DEFAULT);
  /** Per-host drafts (name / gender / voice). Untouched fields fall back to the
   *  matching default cast — the request ALWAYS sends a complete, explicit cast. */
  const [speakerDrafts, setSpeakerDrafts] = useState<
    Record<number, SpeakerDraft>
  >({});
  // Live voice catalog (Supabase ai.voices) — shared one fetch, filtered to
  // the current host count's provider band for the cast editor + buildCast.
  const { voices, loading: voicesLoading, error: voicesError, reload: reloadVoices } =
    useVoices();
  const [showId, setShowId] = useState<string | null>(null);
  const castPreview = usePodcastCastPreview(hostCount, showId);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedHostsOpen, setAdvancedHostsOpen] = useState(false);
  // Custom Dictionary for this run (selection persists per-user for the podcast surface).
  const { consumption: dictConsumption } = useDictionaryContext(PODCAST_DICTIONARY_SURFACE);
  const [truncate, setTruncate] = useState(false);
  /** Per-run image/video caps — default to the full set; the user dials them
   *  down to One or Skip for fast, cheap test runs. */
  const [imageMode, setImageMode] = useState<MediaLimitMode>("all");
  const [featureImageStyle, setFeatureImageStyle] =
    useState<FeatureImageStyleValue>(DEFAULT_FEATURE_IMAGE_STYLE);
  const [videoMode, setVideoMode] = useState<MediaLimitMode>("all");
  const [prepMessage, setPrepMessage] = useState(() =>
    [
      initialInstructions?.trim(),
      initialAgentLabel
        ? `Entryway selected agent profile: ${initialAgentLabel}.`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
  const [firstShowInfo, setFirstShowInfo] = useState("");
  // Optional prep→script transform (one at a time; "none" = pass-through).
  const [postPrep, setPostPrep] = useState<PodcastPostPrepOption>("none");
  // Optional audience re-pitch (podcast.audience_adapter, server-side; runs
  // before the transform above). Empty = skipped.
  const [targetAudience, setTargetAudience] = useState("");

  // A reload brings the picked Sources back — open their tile so they are seen.
  // Adjusted while rendering (React's pattern for state derived from a change), not in an effect.
  const [restoredSourcesShown, setRestoredSourcesShown] = useState(false);
  if (!restoredSourcesShown && !sourceSet.restoring) {
    setRestoredSourcesShown(true);
    if (sourceSet.sources.length > 0 && !text.trim()) setSourceKind("sources");
  }

  const activeSource = GENERATOR_SOURCE_OPTIONS.find((o) => o.kind === sourceKind);
  if (!activeSource) {
    throw new Error(`Unknown podcast source kind: ${sourceKind}`);
  }
  const isRtl = isRtlLanguage(language);
  const usesSources = activeSource.control === "sources";
  const readySources = sourceSet.sources.filter((s) => s.status === "ready" && s.draft.ref);
  const landingSources = sourceSet.sources.filter(
    (s) => s.status === "pending" || s.status === "resolving",
  );
  /** True while a new Source is still landing — blocks Generate. */
  // The editable preview of the text the Sources give (read on the server).
  const sourcePreview = useResolvedSourceText(sourceSet, { enabled: usesSources });
  const resolverBusy = usesSources && (landingSources.length > 0 || sourcePreview.loading);
  const sourceReadiness = usesSources
    ? landingSources.length > 0
      ? // Each card shows its own progress; waiting is not an error.
        { ready: false, message: null }
      : // The server's gate reads the resolved text; the measured size mirrors it
        // (0 = not measured yet — the server decides).
        sourceSet.totalChars > 0 && sourceSet.totalChars < MIN_PODCAST_CONTENT_CHARS
        ? { ready: false, message: "Add more material — these sources are too short." }
        : { ready: true, message: null }
    : getPodcastSourceReadiness(activeSource.inputDataType, text);
  // Typed words and picked Sources combine: either one is enough to start.
  const hasSourceInput = usesSources
    ? readySources.length > 0 || text.trim().length > 0
    : text.trim().length > 0;

  const canGenerate =
    !busy &&
    !savingEdit &&
    !resolverBusy &&
    !!activeSource.inputDataType &&
    hasSourceInput &&
    sourceReadiness.ready;

  /** The exact request the form would submit right now, or null when the
   *  selected source has no wired input type. Shared by Generate and the
   *  surface emitter so `generate_request` can never drift from what is sent. */
  const buildRequestBody = (): PodcastGenerateRequest | null => {
    if (!activeSource.inputDataType) return null;
    const body: PodcastGenerateRequest = {
      input_data_type: activeSource.inputDataType,
      podcast_type: deriveBackendPodcastType(language, format),
      language,
      format,
      host_count: hostCount,
      truncate_audio_for_testing: truncate,
      post_prep_option: postPrep,
      show_id: showId,
    };
    if (theme.trim()) body.theme = theme.trim();
    if (targetAudience.trim()) body.target_audience = targetAudience.trim();
    // The server owns provider routing and the exact default cast. Apply only
    // the user's edits to that preview; if preview is unavailable, send no
    // cast and let the generation server resolve it natively.
    const cast = castToSend({
      hostCount,
      drafts: speakerDrafts,
      voices,
      preview: castPreview.preview ?? null,
      finishedScriptSpeakers: finishedScriptSpeakers(usesSources ? null : text),
    });
    if (cast) body.speakers = cast;
    if (usesSources) {
      const own = text.trim();
      if (readySources.length > 0) {
        // Pointers — the server reads each Source (a cloud PDF as its clean
        // text) through resolve_source_set and links it to the episode. An
        // edited preview is swapped for its own Source at Generate
        // (`withEditedSource`), so the request never carries Source text.
        body.source_set = sourceSet.toSourceSet();
        if (own) body.input_data = own;
      } else {
        body.input_data = own;
      }
    } else {
      body.input_data = text.trim();
    }
    if (prepMessage.trim()) body.prep_user_message = prepMessage.trim();
    if (firstShowInfo.trim()) body.first_show_info_text = firstShowInfo.trim();
    // Media caps ride along only when the user limited them — `all` keeps the
    // server's full default count.
    const maxImages = mediaModeToCap(imageMode);
    if (maxImages !== undefined) body.max_images = maxImages;
    const maxVideos = mediaModeToCap(videoMode);
    if (maxVideos !== undefined) body.max_videos = maxVideos;
    // Feature image style. Sent only when it differs from the default so the
    // server stays the single owner of that default.
    if (featureImageStyle !== DEFAULT_FEATURE_IMAGE_STYLE) {
      body.feature_image_style = featureImageStyle;
    }
    // Attach the resolved dictionary so script + audio agents spell/pronounce
    // terms correctly: `entries` is the persistent (global+user rollup) set,
    // `custom_entries` is the per-task additions (override persistent). Send
    // when either is present.
    const dictEntries = dictConsumption?.resolved.entries ?? [];
    const dictCustom = dictConsumption?.customEntries ?? [];
    if (dictEntries.length > 0 || dictCustom.length > 0) {
      const mapEntry = (e: {
        term: string;
        sounds_like?: string[] | null;
        pronunciation?: string | null;
        ipa?: string | null;
        definition?: string | null;
        category?: string | null;
      }) => ({
        term: e.term,
        sounds_like: e.sounds_like ?? [],
        pronunciation: e.pronunciation ?? null,
        ipa: e.ipa ?? null,
        definition: e.definition ?? null,
        category: e.category ?? null,
      });
      body.dictionary = {
        entries: dictEntries.map(mapEntry),
        custom_entries: dictCustom.map(mapEntry),
        max_inline_chars: dictConsumption?.resolved.effective_max_inline_chars ?? null,
        source_count: dictConsumption?.resolved.source_count ?? 0,
      };
    }
    // Saved podcast audio is the high-quality use case → request the HQ model
    // tier on every provider (the backend resolves the latest HQ model id).
    body.tts_quality = "high_quality";
    return body;
  };

  /**
   * The person corrected "Text from your sources": that text is landed as a
   * Source of its own ("<first source> (edited)", through /sources/land) and the
   * request points at it. The server reads it once; the Sources it was made
   * from ride as `edited_from` (linked to the episode, never read).
   * Null when the save was refused (the person is told why).
   */
  const withEditedSource = async (
    body: PodcastGenerateRequest,
  ): Promise<PodcastGenerateRequest | null> => {
    const edited = sourcePreview.edited ? sourcePreview.text.trim() : "";
    if (!edited || !body.source_set || !sourcePreview.resolved) return body;
    if (!userId) {
      toast.error("Sign in to save your edited text.");
      return null;
    }
    setSavingEdit(true);
    try {
      const saved = await landEditedSourceText({
        text: edited,
        from: body.source_set,
        resolved: sourcePreview.resolved,
        organizationId: await ensureOrgId(null),
        userId,
      });
      return { ...body, source_set: saved.sourceSet, edited_from: saved.editedFrom };
    } catch (err) {
      console.error("[GeneratorForm] the edited source text could not be saved:", err);
      toast.error(`Your edited text could not be saved. ${sourceRefusalSentence(err)}`);
      return null;
    } finally {
      setSavingEdit(false);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const built = buildRequestBody();
    if (!built) return;
    const picked = built.source_set;
    const body = await withEditedSource(built);
    if (!body) return;
    const started = await onGenerate(body);
    // The run owns its Sources now; the next episode starts from an empty input.
    // Read the draft as it is NOW (a Source added while starting stays).
    if (started !== false && picked) {
      const sent = new Set(picked.sources.map((r) => r.resource_id));
      const live = Object.values(
        store.getState().instanceResources.byConversationId[sourceSurfaceKey(PODCAST_SOURCES_SURFACE)] ?? {},
      ).filter((r) => r.blockType === "source_ref");
      for (const r of live) {
        const id = sourceSet.sources.find((c) => c.id === r.resourceId)?.draft.ref?.resource_id;
        if (id && sent.has(id)) sourceSet.remove(r.resourceId);
      }
    }
  };

  // ── Surface emitter (matrx-user/podcast-studio) ───────────────────────
  // Built at Run time from live state. NOTE: no media URLs leave this
  // surface — resolved sources are emitted as extracted TEXT, and file
  // sources as the public URLs the user typed.
  const getSurfaceScope = () => {
    const request = buildRequestBody();
    return createPodcastStudioScope({
      source_kind: sourceKind,
      source_resolving: resolverBusy,
      language,
      format,
      host_count: hostCount,
      episode_shape: {
        language,
        format,
        host_count: hostCount,
        theme: theme.trim() || undefined,
      },
      image_mode: imageMode,
      video_mode: videoMode,
      feature_image_style: featureImageStyle,
      truncate_audio_for_testing: truncate,
      can_generate: canGenerate,
      source_text: activeSource.control === "text" ? text || undefined : undefined,
      source_topic:
        sourceKind === "topic" ? text.trim() || undefined : undefined,
      source_urls: undefined,
      resolved_source_text: undefined,
      theme: theme.trim() || undefined,
      speaker_cast: request?.speakers,
      cast_provider: castPreview.preview?.provider,
      voice_catalog_size: voices.length,
      show_id: showId ?? undefined,
      available_shows: shows.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
      })),
      first_show_info: firstShowInfo.trim() || undefined,
      prep_instructions: prepMessage.trim() || undefined,
      target_audience: targetAudience.trim() || undefined,
      dictionary_entry_count:
        (dictConsumption?.resolved.entries.length ?? 0) +
        (dictConsumption?.customEntries.length ?? 0),
      generate_request: request
        ? (request as unknown as Record<string, unknown>)
        : undefined,
      selection: window.getSelection()?.toString() || undefined,
    });
  };

  // ── Surface write handlers (manifest `writeTargets`) ──────────────────
  // The write half of the 360 loop. Nothing on this surface is persisted —
  // the form IS the draft — so every handler just sets the same `useState`
  // the user's own typing sets, and the value is on screen and editable the
  // moment it lands. Generate stays a human press by design (it costs real
  // money) and is deliberately not a target.
  //
  // Every handler validates and THROWS on a bad shape; the writeback seam
  // (`applySurfaceWrite`) turns a throw into a safe error envelope the agent
  // reads and can correct from. Enum checks run against the SAME constants
  // the form's own controls render from, so the two can never drift.
  const getSurfaceWriteHandlers = () => ({
    source_text: (value: unknown) => {
      if (typeof value !== "string" || !value.trim())
        throw new Error("source_text expects a non-empty string.");
      if (activeSource.control !== "text")
        throw new Error(
          `The selected source is "${activeSource.label}", which does not use the text box. source_text can only be written for the topic, rough-notes, or full-script sources — a person has to switch the source kind first.`,
        );
      setText(value);
    },
    episode_shape: (value: unknown) => {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new Error(
          "episode_shape expects an object: { language?, format?, theme?, host_count? }.",
        );
      const patch = value as Record<string, unknown>;
      const allowedKeys = ["language", "format", "theme", "host_count"];
      const unknownKeys = Object.keys(patch).filter(
        (k) => !allowedKeys.includes(k),
      );
      if (unknownKeys.length > 0)
        throw new Error(
          `episode_shape got unsupported key(s): ${unknownKeys.join(", ")}. Allowed keys: ${allowedKeys.join(" | ")}.`,
        );
      if (Object.keys(patch).length === 0)
        throw new Error(
          `episode_shape needs at least one of: ${allowedKeys.join(" | ")}.`,
        );

      // Validate EVERY key before applying any of them — a partial apply on a
      // half-valid object would leave the form in a state nobody chose.
      const apply: Array<() => void> = [];
      if ("language" in patch) {
        const codes = LANGUAGE_OPTIONS.filter((l) => l.enabled).map(
          (l) => l.code as string,
        );
        if (typeof patch.language !== "string" || !codes.includes(patch.language))
          throw new Error(
            `episode_shape.language expects one of: ${codes.join(" | ")}.`,
          );
        const next = patch.language as PodcastLanguageCode;
        apply.push(() => setLanguage(next));
      }
      if ("format" in patch) {
        const formats = FORMAT_OPTIONS.filter((f) => f.enabled).map(
          (f) => f.value as string,
        );
        if (typeof patch.format !== "string" || !formats.includes(patch.format))
          throw new Error(
            `episode_shape.format expects one of: ${formats.join(" | ")}.`,
          );
        const next = patch.format as PodcastFormat;
        apply.push(() => setFormat(next));
      }
      if ("theme" in patch) {
        if (typeof patch.theme !== "string")
          throw new Error(
            "episode_shape.theme expects a string (empty string clears it).",
          );
        const next = patch.theme;
        apply.push(() => setTheme(next));
      }
      if ("host_count" in patch) {
        if (
          typeof patch.host_count !== "number" ||
          !Number.isInteger(patch.host_count) ||
          patch.host_count < 1 ||
          patch.host_count > MAX_HOST_COUNT
        )
          throw new Error(
            `episode_shape.host_count expects a whole number from 1 to ${MAX_HOST_COUNT}.`,
          );
        const next = patch.host_count;
        apply.push(() => setHostCount(next));
      }
      for (const run of apply) run();
    },
    target_audience: (value: unknown) => {
      if (typeof value !== "string")
        throw new Error(
          "target_audience expects a string (empty string clears it).",
        );
      setTargetAudience(value);
    },
    prep_instructions: (value: unknown) => {
      if (typeof value !== "string")
        throw new Error(
          "prep_instructions expects a string (empty string clears it).",
        );
      setPrepMessage(value);
    },
    show_blurb: (value: unknown) => {
      if (typeof value !== "string")
        throw new Error("show_blurb expects a string (empty string clears it).");
      setFirstShowInfo(value);
    },
  });

  /** Switch source — clear the per-source text so stale content never leaks. */
  const handleSourceChange = (kind: PodcastSourceKind) => {
    setSourceKind(kind);
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/podcast-studio"
      getScope={getSurfaceScope}
      // Stays false, and NOT because the form is read-only — agents fill it in
      // (see getSurfaceWriteHandlers). `isEditable` is a different axis: it
      // only adds the generic `basicEditor` DEFAULT-agent bucket to this page's
      // Agents list (qualifyingDefaultSurfaces). Those agents are built for one
      // focused text editor and read the `content` baseline, which this surface
      // deliberately does not emit — the composer has no single canonical body
      // field. Flipping it would advertise agents that would receive nothing.
      // The writeback seam never consults this flag.
      isEditable={false}
      getWriteHandlers={getSurfaceWriteHandlers}
    >
    <div className="space-y-7">
      {/* ── 1. SOURCE ─────────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <Label className={SECTION_LABEL}>What&apos;s your source?</Label>
        <div className="grid gap-2.5 sm:grid-cols-4">
          {GENERATOR_SOURCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <Tile
                key={opt.kind}
                layout="adaptive"
                hero
                icon={<Icon />}
                title={opt.label}
                line={opt.helper}
                selected={sourceKind === opt.kind}
                onClick={() => handleSourceChange(opt.kind)}
              />
            );
          })}
        </div>

        {/* Matching input control for the selected source. */}
        <div className="pt-0.5">
          {activeSource.control === "text" ? (
            <ProTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={activeSource.placeholder}
              rows={sourceKind === "topic" ? 3 : 7}
              dir={isRtl ? "rtl" : undefined}
              autoGrow
              minHeight={sourceKind === "topic" ? 84 : 168}
              // ProTextarea's contract: autoGrow ALWAYS gets a maxHeight, or
              // the field grows to its measured scrollHeight with nothing
              // stopping it — an empty topic box was rendering 904px tall and
              // pushing the whole form off screen.
              maxHeight={sourceKind === "topic" ? 240 : 420}
              enableTextStats
              className="text-base"
            />
          ) : usesSources ? (
            <div className="space-y-3">
              <SourceInput
                surfaceKey={PODCAST_SOURCES_SURFACE}
                title="Sources"
                purpose="your episode"
                kinds={PODCAST_SOURCE_KINDS}
                deliveries={PODCAST_SOURCE_DELIVERIES}
              />
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Your words</Label>
                <ProTextarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="An angle, a topic or notes of your own"
                  rows={3}
                  dir={isRtl ? "rtl" : undefined}
                  autoGrow
                  minHeight={84}
                  maxHeight={240}
                  className="text-base"
                />
              </div>
              {readySources.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Text from your sources</Label>
                    {sourcePreview.loading && (
                      <span className="text-xs text-muted-foreground">Reading…</span>
                    )}
                    {sourcePreview.truncated && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Cut to its chosen size
                      </span>
                    )}
                    {sourcePreview.edited && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Edited
                      </span>
                    )}
                  </div>
                  {sourcePreview.error ? (
                    <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
                      {sourcePreview.error}
                      <ErrorAlchemyMenu error={sourcePreview.error} className="ml-auto" />
                    </p>
                  ) : (
                    <ProTextarea
                      aria-label="Text from your sources"
                      value={sourcePreview.text}
                      onChange={(e) => sourcePreview.setText(e.target.value)}
                      rows={8}
                      dir={isRtl ? "rtl" : undefined}
                      autoGrow
                      minHeight={168}
                      maxHeight={420}
                      enableTextStats
                      className="text-base"
                    />
                  )}
                  {sourcePreview.droppedNotes.map((note) => (
                    <p key={note} className="text-xs text-muted-foreground">
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
          {hasSourceInput &&
            sourceReadiness.message &&
            !sourceReadiness.ready && (
              <p
                role="alert"
                aria-live="polite"
                className="text-sm text-destructive"
              >
                {sourceReadiness.message}
                <ErrorAlchemyMenu className="ml-auto" />
              </p>
            )}
        </div>

        {/* Topic-only: agent-assisted idea picker. Fills the topic field via
            the existing setText; zero footprint for every other source. */}
        {sourceKind === "topic" && (
          <TopicIdeaHelper
            seedConcept={text}
            onPick={setText}
            showId={showId}
            offerFacts={topicIdeaOfferFacts({
              show: shows.find((s) => s.id === showId) ?? null,
              format,
              language,
              hostCount,
              targetAudience,
            })}
          />
        )}
      </section>

      {/* ── 2. PROCESSING ─────────────────────────────────────────────── */}
      {/* Pre-script (source → script) is WIRED: one optional transform, sent
          as post_prep_option and run by its podcast.post_prep_* Mandate.
          Post-script (script → audio) is still display-only. */}
      <section className="space-y-2.5">
        <Label className={cn(SECTION_LABEL, "flex items-center gap-2")}>
          <Workflow className="h-3.5 w-3.5" />
          Processing
        </Label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <ProcessingLayer
            title="Pre-script processing"
            caption="Source"
            target="Script"
            options={PRE_SCRIPT_PROCESSING_OPTIONS}
            value={postPrep === "none" ? null : postPrep}
            onChange={(v) =>
              setPostPrep(v === null ? "none" : (v as PodcastPostPrepOption))
            }
          />
          <ProcessingLayer
            title="Post-script processing"
            caption="Script"
            target="Audio"
            options={POST_SCRIPT_PROCESSING_OPTIONS}
          />
        </div>
        {/* Audience re-pitch (podcast.audience_adapter) — runs server-side on
            the prepared content, before the transform above, so a translation
            stays the faithful last step. Empty = stage skipped. */}
        <div className="space-y-1">
          <Label htmlFor="target-audience" className="text-xs text-muted-foreground">
            Target audience (optional) — re-pitch the content for a specific listener
          </Label>
          <Input
            id="target-audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder='e.g. "curious beginners", "time-pressed executives", "senior engineers"'
          />
        </div>
      </section>

      {/* ── 3. LANGUAGE ───────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <Label className={cn(SECTION_LABEL, "flex items-center gap-2")}>
          <Languages className="h-3.5 w-3.5" />
          Language
        </Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as PodcastLanguageCode)}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex w-full items-center gap-2">
                  <span>{lang.label}</span>
                  <span
                    className="text-xs text-muted-foreground"
                    dir={lang.rtl ? "rtl" : undefined}
                  >
                    {lang.native}
                  </span>
                  {!lang.enabled && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      Soon
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Scripts and audio are generated natively in the language you pick.
        </p>
      </section>

      {/* ── 4. FORMAT ─────────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <Label className={SECTION_LABEL}>Format</Label>
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {FORMAT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <Tile
                key={opt.value}
                layout="adaptive"
                hero
                icon={<Icon />}
                title={opt.label}
                line={opt.helper}
                end={opt.enabled ? undefined : <ComingSoonBadge />}
                selected={format === opt.value}
                disabled={!opt.enabled}
                onClick={() => setFormat(opt.value)}
              />
            );
          })}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Theme / framing (optional)
          </Label>
          <Input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={'e.g. "skeptic vs optimist" or "keep it beginner-friendly"'}
          />
        </div>
      </section>

      {/* ── 5. HOSTS ──────────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <Label className={cn(SECTION_LABEL, "flex items-center gap-2")}>
          <Users className="h-3.5 w-3.5" />
          Hosts
        </Label>
        <SegmentedControl
          aria-label="Number of hosts"
          fill
          value={hostCount >= 5 ? "5+" : String(hostCount)}
          onValueChange={(v) => setHostCount(v === "5+" ? Math.max(hostCount, 5) : Number(v))}
          data={HOST_COUNT_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.value === "5+" && hostCount >= 5 ? String(hostCount) : opt.label,
            title: opt.helper ?? undefined,
          }))}
        />
        {hostCount >= 5 && (
          <div className="flex items-center gap-2.5">
            <Label className="text-xs text-muted-foreground">Exact count</Label>
            <Select
              value={String(hostCount)}
              onValueChange={(v) => setHostCount(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: MAX_HOST_COUNT - 4 }, (_, i) => i + 5).map(
                  (n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground">
              Large casts run a moderated roundtable format.
            </span>
          </div>
        )}

        {/* Advanced hosts — optional per-host name + voice. Anything left on
            auto gets the server's defaults; everything here is optional. */}
        <Collapsible
          open={advancedHostsOpen}
          onOpenChange={setAdvancedHostsOpen}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <span className="flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5" />
              Host names, genders &amp; voices
              <span className="text-[11px] font-normal text-muted-foreground">
                optional
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                advancedHostsOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            {castPreview.orgRequired ? (
              <OrganizationRequiredNotice
                what="The cast"
              />
            ) : (
              <SpeakerCastEditor
                hostCount={hostCount}
                drafts={speakerDrafts}
                onChange={(i, patch) =>
                  setSpeakerDrafts((d) => ({ ...d, [i]: { ...d[i], ...patch } }))
                }
                defaults={castPreview.preview?.speakers ?? []}
                voices={
                  castPreview.preview
                    ? voicesForProvider(voices, castPreview.preview.provider)
                    : []
                }
                provider={castPreview.preview?.provider ?? null}
                loading={voicesLoading || castPreview.loading}
                error={castPreview.error ?? voicesError}
                onReload={() => {
                  castPreview.reload();
                  reloadVoices();
                }}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* ── 6. SHOW PICKER ────────────────────────────────────────────── */}
      <ShowPicker
        shows={shows}
        value={showId}
        onChange={setShowId}
        onShowCreated={onShowCreated}
      />

      {/* ── 7. ADVANCED ───────────────────────────────────────────────── */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced options
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs text-muted-foreground">Dictionary</Label>
              <p className="text-[11px] text-muted-foreground">
                Apply your terminology &amp; pronunciation so names are spelled and spoken correctly.
              </p>
            </div>
            <DictionaryIndicatorButton surfaceKey={PODCAST_DICTIONARY_SURFACE} variant="labeled" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Extra instruction to the research / extraction agent
            </Label>
            <ProTextarea
              value={prepMessage}
              onChange={(e) => setPrepMessage(e.target.value)}
              placeholder="Optional — e.g. focus on the practical takeaways"
              rows={2}
              showCopyButton={false}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Show intro / blurb
            </Label>
            <ProTextarea
              value={firstShowInfo}
              onChange={(e) => setFirstShowInfo(e.target.value)}
              placeholder="Optional — a short intro for the show"
              rows={2}
              showCopyButton={false}
            />
          </div>

          {/* Feature image — the sixth image, drawn from the finished
              transcript rather than the up-front metadata blurbs. Sits with the
              creative controls, NOT with the media limits below (those are
              explicitly framed as test/cost controls). */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Feature image style
            </Label>
            <Select
              value={featureImageStyle}
              onValueChange={(v) => setFeatureImageStyle(toFeatureImageStyle(v))}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_IMAGE_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {imageMode === "skip" ? (
                // The server gates the feature image on the image budget, so
                // "Skip" genuinely skips it — say so rather than promising an
                // image that will never be rendered.
                <>Skipped while Images below is set to Skip.</>
              ) : (
                <>
                  {FEATURE_IMAGE_STYLES.find(
                    (s) => s.value === featureImageStyle,
                  )?.blurb ?? ""}{" "}
                  An extra image rendered from the full transcript.
                </>
              )}
            </p>
          </div>

          {/* Test mode — hidden in Advanced and enabled only when explicitly requested. */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
              <FlaskConical className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="truncate-toggle"
                  className="text-sm font-medium text-foreground"
                >
                  Test mode — short audio
                </Label>
                <Switch
                  id="truncate-toggle"
                  checked={truncate}
                  onCheckedChange={setTruncate}
                />
              </div>
              <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
                Trims audio to ~one line per host so runs stay fast and cheap.
                Use the controls below to also limit images and videos. Turn off
                for a full-length episode.
              </p>
            </div>
          </div>

          {/* Media output — cap or skip the (expensive) image/video fan-out so a
              test run is fast and cheap without touching audio or the script. */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3.5">
            <div>
              <Label className="text-sm font-medium text-foreground">
                Images &amp; videos
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Limit or skip media generation for faster, cheaper test runs.
              </p>
            </div>
            <MediaLimitField
              icon={Images}
              label="Images"
              help="Cover art & scene stills"
              value={imageMode}
              onChange={setImageMode}
            />
            <MediaLimitField
              icon={Clapperboard}
              label="Videos"
              help="Generated motion clips"
              value={videoMode}
              onChange={setVideoMode}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate */}
      <div className="flex justify-end">
        <Button
          icon={<AudioLines />}
          variant="primary"
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate episode
        </Button>
      </div>
    </div>
    </SurfaceRuntimeProvider>
  );
}

// One processing layer. With `onChange` it is INTERACTIVE: a single-select
// option row (click again to clear → pass-through). Without it, it stays the
// dashed display-only preview of a stage that isn't wired yet.
function ProcessingLayer({
  title,
  caption,
  target,
  options,
  value,
  onChange,
}: {
  title: string;
  caption: string;
  target: string;
  options: { value: string; label: string; helper: string }[];
  value?: string | null;
  onChange?: (value: string | null) => void;
}) {
  const interactive = !!onChange;
  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-3",
        interactive
          ? "border-border bg-card"
          : "border-dashed border-border bg-muted/20",
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {title}
          {!interactive && <ComingSoonBadge />}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">{caption}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="rounded bg-muted px-1.5 py-0.5">{target}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const selected = interactive && value === o.value;
          return (
            <Tooltip key={o.value}>
              <TooltipTrigger asChild>
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onChange(selected ? null : o.value)}
                    aria-pressed={selected}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-[11px] font-normal transition-colors",
                        !selected &&
                          "text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {o.label}
                    </Badge>
                  </button>
                ) : (
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed border-dashed text-[11px] font-normal text-muted-foreground"
                  >
                    {o.label}
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent>{o.helper}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
