"use client";

// features/education/media/audio/components/AudioStudyNew.tsx
//
// Create an audio study: Create -> choose sources, style and details -> results,
// the same page shape as every Education create screen (`EducationCreatePage`).
// Sources go through the one Source input (a deck via Use existing, a topic via
// the Topic tile) and the server's resolve; Style is the format (overview /
// debate / panel), cast size, and — when a deck is picked — weak-area
// adaptivity. Metered via useEntitlement('education.audio_generate') with the
// limit shown BEFORE the action (TRUST mandate: never a mid-workflow ambush).
// Delegates the run row + artifact + stream + navigate to useAudioStudyCreate.
//
// React Compiler is on: no manual memo.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Headphones, MessagesSquare, Radio, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { fcService } from "@/features/flashcards/data/fcService";
import type { FcSetRow } from "@/features/flashcards/data/types";
import { useEntitlementGuard } from "@/features/entitlements/components/useEntitlementGuard";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  createEducationAudioStudyScope,
  type AudioDeckOption,
} from "@/features/surfaces/manifests/education-audio-study.manifest";
import { EducationCreatePage } from "@/features/education/create/EducationCreatePage";
import { useEducationSources } from "@/features/education/create/useEducationSources";
import { useStyleDraft } from "@/features/education/create/useStyleDraft";
import { useAudioStudyCreate } from "../useAudioStudyCreate";
import type { EduAudioFormat } from "../../types";

const SURFACE_NAME = "matrx-user/education-audio-study";
/** The Source input's key on this page — picks are held and kept under it. */
export const AUDIO_STUDY_SURFACE_KEY = "education:audio-study:new";
/** The Style and details answers, kept across a reload like the Sources are. */
export const AUDIO_STUDY_STYLE_DRAFT_ID = "education:audio-study:new:style";

const FORMATS: {
  id: EduAudioFormat;
  label: string;
  blurb: string;
  icon: typeof Headphones;
  defaultHosts: number;
}[] = [
  {
    id: "overview",
    label: "Overview",
    blurb: "A narrated walkthrough of the material.",
    icon: Radio,
    defaultHosts: 2,
  },
  {
    id: "debate",
    label: "Debate",
    blurb: "Two distinct voices argue opposing views.",
    icon: MessagesSquare,
    defaultHosts: 2,
  },
  {
    id: "panel",
    label: "Panel",
    blurb: "A multi-host expert roundtable.",
    icon: Users,
    defaultHosts: 4,
  },
];

const PANEL_HOSTS = [3, 4, 5, 6] as const;

function isFormat(v: unknown): v is EduAudioFormat {
  return FORMATS.some((f) => f.id === v);
}

interface StyleDraft {
  format?: EduAudioFormat;
  hostCount?: number;
  adaptive?: boolean;
}

/** Map the stored bag back to the form — refusing (and naming) anything unknown. */
export function restoreAudioStyle(data: Record<string, unknown>): { values: StyleDraft; rejectedKeys: string[] } {
  const values: StyleDraft = {};
  const rejectedKeys: string[] = [];
  for (const [key, v] of Object.entries(data)) {
    if (key === "format" && isFormat(v)) values.format = v;
    else if (key === "hostCount" && typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 6) values.hostCount = v;
    else if (key === "adaptive" && typeof v === "boolean") values.adaptive = v;
    else rejectedKeys.push(key);
  }
  return { values, rejectedKeys };
}

const defaultHostsOf = (format: EduAudioFormat) => FORMATS.find((f) => f.id === format)?.defaultHosts ?? 2;

export function AudioStudyNew() {
  const params = useSearchParams();
  const { create, busy } = useAudioStudyCreate();
  const gen = useEntitlementGuard("education.audio_generate");
  // School-safe COPPA gate: an under-13 account with no active guardian link is
  // blocked from AI generation until a parent approves (never a silent failure).
  const coppa = useAiComplianceGate();

  const [decks, setDecks] = useState<FcSetRow[]>([]);
  const [decksLoaded, setDecksLoaded] = useState(false);
  const formatParam = params.get("format");
  const initialFormat: EduAudioFormat = isFormat(formatParam) ? formatParam : "overview";
  const [format, setFormatState] = useState<EduAudioFormat>(initialFormat);
  const [hostCount, setHostCount] = useState<number>(defaultHostsOf(initialFormat));
  const [adaptive, setAdaptive] = useState<boolean>(true);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    fcService.listDecks().then((res) => {
      if (res.data) setDecks(res.data);
      setDecksLoaded(true);
    });
  }, []);

  const linkDeckId = params.get("deck");
  const sources = useEducationSources(AUDIO_STUDY_SURFACE_KEY, {
    seedDeck: linkDeckId ? { id: linkDeckId, name: decks.find((d) => d.id === linkDeckId)?.name } : null,
    seedReady: decksLoaded,
    onRelease: () => void start(),
  });

  const styleDraft = useStyleDraft<StyleDraft>(AUDIO_STUDY_STYLE_DRAFT_ID, restoreAudioStyle, (v) => {
    if (v.format) setFormatState(v.format);
    if (v.hostCount !== undefined) setHostCount(v.hostCount);
    if (v.adaptive !== undefined) setAdaptive(v.adaptive);
  });

  // A new format brings its own sensible cast size.
  const chooseFormat = (next: EduAudioFormat) => {
    setFormatState(next);
    setHostCount(defaultHostsOf(next));
    styleDraft.patch({ format: next, hostCount: defaultHostsOf(next) });
  };

  async function run() {
    setReading(true);
    let prepared;
    try {
      prepared = await sources.prepare();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the sources");
      return;
    } finally {
      setReading(false);
    }
    const ok = await create({
      format,
      material: prepared,
      hostCount,
      adaptive: sources.deckCount > 0 && adaptive,
    });
    // Meter only a real generation; a failed/early-returned create burns nothing.
    if (ok) {
      await gen.commit({ initiation: "user" });
      sources.clearUsed();
      styleDraft.clear();
    }
  }

  async function start() {
    // School-safe gate FIRST (COPPA), then the server-truth entitlement check.
    if (!(await coppa.ensureAllowed())) return;
    await gen.guard(run);
  }

  function handleMake() {
    if (sources.blockedReason || busy || reading || gen.isChecking) return;
    if (sources.waitingForClean.length > 0) {
      sources.setHolding(true);
      return;
    }
    void start();
  }

  // Read at trigger time, never from stale closure state.
  const buildScope = () => {
    const picked = sources.ready.filter((s) => s.draft.ref?.resource_type === "fc_set");
    const firstDeck = picked[0]?.draft;
    const kind = !sources.hasSources ? "topic" : picked.length === sources.ready.length ? "deck" : "sources";
    return createEducationAudioStudyScope({
      view: "new",
      request_source_kind: kind,
      request_deck_id: firstDeck?.ref?.resource_id || undefined,
      request_topic: sources.topic || undefined,
      request_format: format,
      request_host_count: hostCount,
      request_adaptive: adaptive,
      generation_request: {
        source_kind: kind,
        deck_id: firstDeck?.ref?.resource_id ?? null,
        topic: sources.topic || null,
        format,
        host_count: hostCount,
        adaptive,
      },
      available_decks: decks.map((d): AudioDeckOption => ({ id: d.id, name: d.name })),
    });
  };

  const count = sources.ready.length;
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? "Audio";
  return (
    <SurfaceRuntimeProvider surfaceName={SURFACE_NAME} getScope={buildScope}>
      <EducationCreatePage
        title="New audio study"
        backHref="/education/audio-study"
        surfaceKey={AUDIO_STUDY_SURFACE_KEY}
        purpose="your audio study"
        sources={sources}
        styleDraft={styleDraft}
        onStartFresh={() => {
          setFormatState("overview");
          setHostCount(defaultHostsOf("overview"));
          setAdaptive(true);
        }}
        make={{
          label: "Make the audio",
          busyLabel: "Starting your audio…",
          icon: <Headphones />,
          busy: busy || reading,
          onMake: handleMake,
          extraBlockedReason: gen.isChecking ? "Checking your limit…" : null,
          summary: sources.hasSources
            ? `${formatLabel} of ${count} ${count === 1 ? "source" : "sources"}${sources.topic ? `, focused on “${sources.topic}”` : ""}`
            : `${formatLabel} about “${sources.topic}”`,
          capability: "education.audio_generate",
          gates: (
            <>
              <coppa.Gate />
              <gen.Paywall />
            </>
          ),
          operation: "Make an audio study",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label>Format</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              const active = format === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={busy || reading}
                  aria-pressed={active}
                  onClick={() => chooseFormat(f.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                    active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium text-foreground">{f.label}</span>
                  <span className="text-[11px] leading-tight text-muted-foreground">{f.blurb}</span>
                </button>
              );
            })}
          </div>
        </div>

        {format === "panel" ? (
          <div className="flex flex-col gap-1.5">
            <Label>Hosts</Label>
            <SegmentedControl
              aria-label="Hosts"
              value={String(hostCount)}
              onValueChange={(v) => {
                setHostCount(Number(v));
                styleDraft.patch({ hostCount: Number(v) });
              }}
              data={PANEL_HOSTS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        ) : null}

        {sources.deckCount > 0 ? (
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              checked={adaptive}
              disabled={busy || reading}
              onCheckedChange={(checked) => {
                setAdaptive(checked === true);
                styleDraft.patch({ adaptive: checked === true });
              }}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              Target my weak areas
              <span className="block text-[11px] text-muted-foreground">
                Spends extra time on the concepts you&apos;ve been struggling with.
              </span>
            </span>
          </label>
        ) : null}
      </EducationCreatePage>
    </SurfaceRuntimeProvider>
  );
}
