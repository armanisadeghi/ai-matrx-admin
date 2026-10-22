"use client";

// features/education/memory/components/MemoryNew.tsx
//
// Create memory aids: Create -> choose sources, style and details -> results,
// the same page shape as every Education create screen (`EducationCreatePage`).
// Sources go through the one Source input (a deck via Use existing, a topic via
// the Topic tile) and the server's resolve; the memory_aid agent
// (useGenerateMemoryAid -> useFloatingAgentRun) writes the aids; the envelope is
// persisted to study_media (media_kind='memory_aid') with a citation per Source
// and a lineage edge to each, and the aid opens. Metered via
// useEntitlementGuard('education.memory_generate') with the limit shown BEFORE
// the action (TRUST mandate — no mid-generation ambush).
// React Compiler is on: no manual memo.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain } from "lucide-react";
import { toast } from "@/lib/toast";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { fcService } from "@/features/flashcards/data/fcService";
import type { FcSetRow } from "@/features/flashcards/data/types";
import { useEntitlementGuard } from "@/features/entitlements/components/useEntitlementGuard";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import { studyMediaService } from "@/features/education/media/service";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  createEducationMemoryScope,
  MEMORY_FOCUS_MAX,
  MEMORY_TOPIC_MAX,
  MEMORY_TOPIC_MIN,
  type MemoryDeckOption,
} from "@/features/surfaces/manifests/education-memory.manifest";
import { EducationCreatePage } from "@/features/education/create/EducationCreatePage";
import { useEducationSources } from "@/features/education/create/useEducationSources";
import { useStyleDraft } from "@/features/education/create/useStyleDraft";
import { generationSourceWrite } from "@/features/education/create/generationSourceWrite";
import { linkMadeFrom, madeFromConfig } from "@/features/education/create/madeFrom";
import { citeMemoryAid } from "../itemCitations";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useGenerateMemoryAid } from "../useGenerateMemoryAid";
import { memoryAidCounts } from "../types";
import { EDU_MEMORY_MANDATES } from "../mandates";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { parseCreateMemoryAids } from "../memoryWrites";

const SURFACE_NAME = "matrx-user/education-memory";
/** The Source input's key on this page — picks are held and kept under it. */
export const MEMORY_SURFACE_KEY = "education:memory:new";
/** The Style and details answers, kept across a reload like the Sources are. */
export const MEMORY_STYLE_DRAFT_ID = "education:memory:new:style";

interface StyleDraft {
  focus?: string;
}

/** Map the stored bag back to the form — refusing (and naming) anything unknown. */
export function restoreMemoryStyle(data: Record<string, unknown>): { values: StyleDraft; rejectedKeys: string[] } {
  const values: StyleDraft = {};
  const rejectedKeys: string[] = [];
  for (const [key, v] of Object.entries(data)) {
    if (key === "focus" && typeof v === "string") values.focus = v.slice(0, MEMORY_FOCUS_MAX);
    else rejectedKeys.push(key);
  }
  return { values, rejectedKeys };
}

export function MemoryNew() {
  const router = useRouter();
  const params = useSearchParams();
  const { generate, isGenerating } = useGenerateMemoryAid();
  const gen = useEntitlementGuard("education.memory_generate");
  // School-safe COPPA gate: an under-13 account with no active guardian link is
  // blocked from AI generation until a parent approves (never a silent failure).
  const coppa = useAiComplianceGate();

  const [decks, setDecks] = useState<FcSetRow[]>([]);
  const [decksLoaded, setDecksLoaded] = useState(false);
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    fcService.listDecks().then((res) => {
      if (res.data) setDecks(res.data);
      setDecksLoaded(true);
    });
  }, []);

  const linkDeckId = params.get("deck");
  const sources = useEducationSources(MEMORY_SURFACE_KEY, {
    seedDeck: linkDeckId ? { id: linkDeckId, name: decks.find((d) => d.id === linkDeckId)?.name } : null,
    seedReady: decksLoaded,
    onRelease: () => void start(),
  });

  const styleDraft = useStyleDraft<StyleDraft>(MEMORY_STYLE_DRAFT_ID, restoreMemoryStyle, (v) => {
    if (v.focus !== undefined) setFocus(v.focus);
  });

  async function run() {
    setRunError(null);
    setBusy(true);
    try {
      const prepared = await sources.prepare();
      if (prepared.notes.length) toast.info(prepared.notes.join(" "));
      const payload = await generate(
        {
          source_content: prepared.content,
          title: prepared.title,
          focus: sources.focusLine(focus),
        },
        "user",
      );
      const title = payload.title || prepared.title;
      const media = await studyMediaService.create({
        mediaKind: "memory_aid",
        title,
        source: prepared.source,
        config: {
        focus: focus.trim() || undefined,
        ...memoryAidCounts(payload),
        // Each aid cites the passage it came from (page / place), kept beside the aid by what it says.
        itemCitations: citeMemoryAid(payload, prepared.chunks),
        ...madeFromConfig(prepared),
      },
        trust: prepared.trust,
        irEnvelope: payload,
        status: "ready",
      });
      if (media.error || !media.data) {
        const message = media.error ?? "Couldn't save the memory aids";
        setRunError(message);
        toast.error(message);
        return;
      }
      const href = `/education/memory/${media.data.id}`;
      await linkMadeFrom(
        prepared,
        { resourceType: "study_media", artifactId: media.data.id, targetKind: "memory_aid", title, href },
        await ensureOrgId(undefined),
      );
      // Metered action SUCCEEDED — record real usage so the meter decrements
      // (honest even while enforced:false). Failed branches above return
      // first, so a failed generation never burns quota.
      await gen.commit({ initiation: "user" });
      sources.clearUsed();
      styleDraft.clear();
      router.push(href);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't generate memory aids";
      setRunError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    // School-safe gate FIRST (COPPA), then the server-truth entitlement check.
    if (!(await coppa.ensureAllowed())) return;
    await gen.guard(run);
  }

  function handleMake() {
    if (sources.blockedReason || busy || isGenerating || gen.isChecking) return;
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
    const trimmedFocus = focus.trim();
    return createEducationMemoryScope({
      view: "new",
      request_source_kind: kind,
      ...(firstDeck?.ref ? { request_deck_id: firstDeck.ref.resource_id, request_deck_title: firstDeck.label } : {}),
      ...(sources.topic ? { request_topic: sources.topic } : {}),
      ...(trimmedFocus ? { request_focus: trimmedFocus } : {}),
      generation_request: {
        source_kind: kind,
        deck_id: firstDeck?.ref?.resource_id ?? null,
        deck_title: firstDeck?.label ?? null,
        topic: sources.topic || null,
        focus: trimmedFocus || null,
      },
      available_decks: decks.map((d): MemoryDeckOption => ({ id: d.id, name: d.name })),
    });
  };

  // ── Surface write targets (the write half) ──────────────────────────────
  // Both generation targets STAGE into the same setters and doors the learner's
  // own typing and picking use — never a parallel write path — so an applied
  // write is visible in the form immediately and nothing is generated or
  // persisted. The metered spend stays behind the learner's own Make press,
  // where the COPPA gate, the entitlement guard and studyMediaService.create
  // run. Fresh closures per call (getWriteHandlers contract). The list and
  // detail mounts of this surface register NO handlers.
  const getSurfaceWriteHandlers = () => ({
    ...collectionWriteHandlers({
      plural: "memory_aids", singular: "memory aid",
      create: {
        parse: parseCreateMemoryAids,
        run: async (aid) => {
          const result = await studyMediaService.create({ mediaKind: "memory_aid", title: aid.title,
            irEnvelope: aid, status: "ready" });
          if (result.error || !result.data) throw new Error(result.error ?? "Could not create memory aid.");
          return { id: result.data.id, name: result.data.title };
        }, nameOf: (aid) => aid.title,
      },
    }, refuseSurfaceWrite),
    generation_source: generationSourceWrite({
      what: "memory aids",
      isBusy: isGenerating || busy,
      decks,
      topicMin: MEMORY_TOPIC_MIN,
      topicMax: MEMORY_TOPIC_MAX,
      setTopic: sources.set.setTopic,
      pickDeck: (deck) => {
        if (!sources.set.hasRef("fc_set", deck.id))
          sources.intake.addExisting({ token: "fc_set", id: deck.id, title: deck.name });
      },
    }),

    generation_focus: (value: unknown) => {
      if (isGenerating || busy)
        throw new Error(
          "generation_focus refused — memory aids are being generated right now. Wait for the run to finish before changing the focus.",
        );
      if (typeof value !== "string")
        throw new Error(
          "generation_focus expects a plain text string, not JSON and not JSON-encoded, no code fence. Send the empty string to clear the focus.",
        );
      const trimmed = value.trim();
      if (trimmed.length > MEMORY_FOCUS_MAX)
        throw new Error(
          `generation_focus expects at most ${MEMORY_FOCUS_MAX} characters after trimming (got ${trimmed.length}).`,
        );
      setFocus(trimmed);
      styleDraft.patch({ focus: trimmed });
    },
  });

  const count = sources.ready.length;
  return (
    <SurfaceRuntimeProvider surfaceName={SURFACE_NAME} getScope={buildScope} getWriteHandlers={getSurfaceWriteHandlers}>
      <EducationCreatePage
        title="New memory aids"
        backHref="/education/memory"
        surfaceKey={MEMORY_SURFACE_KEY}
        purpose="your memory aids"
        sources={sources}
        styleDraft={styleDraft}
        onStartFresh={() => setFocus("")}
        make={{
          label: "Make memory aids",
          busyLabel: "Building your memory aids…",
          icon: <Brain />,
          busy: busy || isGenerating,
          onMake: handleMake,
          extraBlockedReason: gen.isChecking ? "Checking your limit…" : null,
          summary: sources.hasSources
            ? `Memory aids from ${count} ${count === 1 ? "source" : "sources"}${sources.topic ? `, focused on “${sources.topic}”` : ""}`
            : `Memory aids about “${sources.topic}”`,
          error: runError,
          capability: "education.memory_generate",
          mandates: { feature: "education", keys: [EDU_MEMORY_MANDATES.memoryAid] },
          gates: (
            <>
              <coppa.Gate />
              <gen.Paywall />
            </>
          ),
          operation: "Make memory aids",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mem-focus">
            Focus <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="mem-focus"
            value={focus}
            maxLength={MEMORY_FOCUS_MAX}
            onChange={(e) => {
              setFocus(e.target.value);
              styleDraft.patch({ focus: e.target.value });
            }}
            placeholder="Concentrate on a specific list, term set, or concept…"
            data-surface-value="request_focus"
            disabled={busy || isGenerating}
          />
        </div>
      </EducationCreatePage>
    </SurfaceRuntimeProvider>
  );
}
