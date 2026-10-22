"use client";

// features/education/media/mindmap/components/MindMapNew.tsx
//
// Create a mind map: Create -> choose sources, style and details -> results,
// the same page shape as every Education create screen (`EducationCreatePage`).
// Sources go through the one Source input (a deck via Use existing, a topic via
// the Topic tile) and the server's resolve; the diagram_spec agent
// (useGenerateMindMap — one round-trip) maps the text; the envelope is persisted
// to study_media with a citation per Source and a lineage edge to each, and the
// map opens. Metered via useEntitlement('education.mindmap_generate') with the
// limit shown BEFORE the action.
//
// React Compiler is on: no manual memo.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Network } from "lucide-react";
import { toast } from "@/lib/toast";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { fcService } from "@/features/flashcards/data/fcService";
import { useEntitlementGuard } from "@/features/entitlements/components/useEntitlementGuard";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createEducationMindMapsScope } from "@/features/surfaces/manifests/education-mind-maps.manifest";
import { EducationCreatePage } from "@/features/education/create/EducationCreatePage";
import { leftOutLine, seedFromParams, useEducationSources, TOPIC_MIN_CHARS } from "@/features/education/create/useEducationSources";
import { useCreateRun } from "@/features/education/create/useCreateRun";
import { restoreStudyRunRequest } from "@/features/education/create/createRunRequest";
import { useDeckChoices } from "@/features/education/create/useDeckChoices";
import { STUDY_FROM_DECK_KINDS } from "@/features/education/create/studyFromDeck";
import { useStyleDraft } from "@/features/education/create/useStyleDraft";
import { generationSourceWrite } from "@/features/education/create/generationSourceWrite";
import { linkMadeFrom, madeFromConfig } from "@/features/education/create/madeFrom";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { studyMediaService } from "../../service";
import { useGenerateMindMap } from "../useGenerateMindMap";
import { linkDiagramToCards, type LinkableCard } from "../linkCards";
import { withUniqueEdgeIds } from "../mindMapWrites";
import { EDU_MEDIA_MANDATES } from "../mandates";

/** Bounds the write handlers enforce (the form's own input is unbounded text). */
const TOPIC_MAX = 500;
const FOCUS_MAX = 300;

/** The Source input's key on this page — picks are held and kept under it. */
export const MIND_MAP_SURFACE_KEY = "education:mind-maps:new";
/** The Style and details answers, kept across a reload like the Sources are. */
export const MIND_MAP_STYLE_DRAFT_ID = "education:mind-maps:new:style";

interface StyleDraft {
  focus?: string;
}

/** Map the stored bag back to the form — refusing (and naming) anything unknown. */
export function restoreMindMapStyle(data: Record<string, unknown>): { values: StyleDraft; rejectedKeys: string[] } {
  const values: StyleDraft = {};
  const rejectedKeys: string[] = [];
  for (const [key, v] of Object.entries(data)) {
    if (key === "focus" && typeof v === "string") values.focus = v.slice(0, FOCUS_MAX);
    else rejectedKeys.push(key);
  }
  return { values, rejectedKeys };
}

export function MindMapNew() {
  const router = useRouter();
  const params = useSearchParams();
  const { generate, isGenerating } = useGenerateMindMap();
  const gen = useEntitlementGuard("education.mindmap_generate");
  // School-safe COPPA gate: an under-13 account with no active guardian link is
  // blocked from AI generation until a parent approves (never a silent failure).
  const coppa = useAiComplianceGate();

  // The learner's decks — only for what an agent is offered, read when it asks.
  const deckChoices = useDeckChoices();
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const sources = useEducationSources(MIND_MAP_SURFACE_KEY, {
    seed: seedFromParams(params),
    onRelease: () => void start(),
    lateMark: "Not in this map",
  });
  // The run lives in this tab: a reload mid-run says so and offers the same request.
  const createRun = useCreateRun(`${MIND_MAP_SURFACE_KEY}:run`, restoreStudyRunRequest(restoreMindMapStyle), sources, {
    onRedo: (req) => setFocus(req.style.focus ?? ""),
  });

  const styleDraft = useStyleDraft<StyleDraft>(MIND_MAP_STYLE_DRAFT_ID, restoreMindMapStyle, (v) => {
    if (v.focus !== undefined) setFocus(v.focus);
  });

  async function run() {
    setRunError(null);
    setBusy(true);
    try {
      await createRun.track(sources.runRequest({ focus }), (ctx) => makeMap(ctx.saving));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Couldn't generate the mind map";
      setRunError(message);
      toast.error(message);
    } finally {
      sources.endRun();
      setBusy(false);
    }
  }

  async function makeMap(saving: () => Promise<void>) {
    const prepared = await sources.prepare();
    if (prepared.notes.length) toast.info(prepared.notes.join(" "));

    // For a deck source, load the cards so generated nodes can be linked back to
    // the exact card they summarize (clickable node → source card / Ask tutor).
    const deckCards: LinkableCard[] = [];
    for (const deckId of prepared.deckIds) {
      const withCards = await fcService.getDeckWithCards(deckId);
      for (const c of withCards.data?.cards ?? []) deckCards.push({ id: c.id, front: c.front, back: c.back });
    }

    const spec = await generate(
      {
        source_content: prepared.content,
        title: prepared.title,
        focus: sources.focusLine(focus),
      },
      "user",
    );
    // Resolve nodes → source cards where we can (DoD item 3). Unmatched nodes
    // stay unlinked; a click still offers "ask the tutor about this idea".
    const { spec: linkedSpec, linkedCount } = linkDiagramToCards(spec, deckCards);
    const title = spec.title || prepared.title;
    // Past this point the save may land even if this page never hears back.
    await saving();
    const media = await studyMediaService.create({
      mediaKind: "mind_map",
      title,
      source: prepared.source,
      config: {
        diagramKind: "diagram_spec",
        hint: focus.trim() || undefined,
        linkedCards: linkedCount,
        ...madeFromConfig(prepared),
      },
      trust: prepared.trust,
      irEnvelope: withUniqueEdgeIds(linkedSpec),
      diagramKind: "diagram_spec",
      status: "ready",
    });
    if (media.error || !media.data) {
      const message = media.error ?? "Couldn't save the mind map";
      setRunError(message);
      toast.error(message);
      return;
    }
    const href = `/education/mind-maps/${media.data.id}`;
    await linkMadeFrom(
      prepared,
      { resourceType: "study_media", artifactId: media.data.id, targetKind: "mind_map", title, href },
      await ensureOrgId(undefined),
    );
    // Metered action SUCCEEDED — record real usage so the meter decrements
    // (honest even while enforced:false). Failed branches return first, so a
    // failed generation never burns quota.
    await gen.commit({ initiation: "user" });
    const leftOut = sources.clearUsed();
    if (leftOut > 0) toast.info(leftOutLine(leftOut, "the map"));
    styleDraft.clear();
    router.push(href);
  }

  async function start() {
    // School-safe gate FIRST (COPPA): an unconsented under-13 opens the "a parent
    // must approve" dialog and never reaches the billing gate or starts a run.
    if (!(await coppa.ensureAllowed())) return;
    // Canonical guard: awaits the server-truth check BEFORE spending; on a
    // cap-hit it opens the respectful contextual paywall (not a toast) and never
    // starts the work (DoD #2 — no mid-generation ambush).
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

  // Live surface scope for the Agents chrome (matrx-user/education-mind-maps,
  // create view). A plain synchronous function over the live render values —
  // the Surface Context window polls this every 400ms, so it must never fetch.
  const getScope = () => {
    const pickedDecks = sources.ready.filter((s) => s.draft.ref?.resource_type === "fc_set");
    const firstDeck = pickedDecks[0]?.draft;
    const kind = !sources.hasSources
      ? "topic"
      : pickedDecks.length === sources.ready.length
        ? "deck"
        : "sources";
    void deckChoices.load();
    const decks = deckChoices.decks;
    return createEducationMindMapsScope({
      view: "create",
      source_kind: kind,
      ...(sources.topic ? { topic: sources.topic } : {}),
      ...(focus.trim() ? { focus: focus.trim() } : {}),
      ...(firstDeck?.ref
        ? { selected_deck: { id: firstDeck.ref.resource_id, name: firstDeck.label } }
        : {}),
      available_decks: decks.map((d) => ({ id: d.id, name: d.name })),
      deck_count: decks.length,
      source_selection: {
        source_kind: kind,
        topic: sources.topic || null,
        deck_id: firstDeck?.ref?.resource_id ?? null,
        deck_name: firstDeck?.label ?? null,
      },
      is_generating: isGenerating || busy,
    });
  };

  // Write half of the mind-map surface (manifest `writeTargets`). Both targets
  // are draft-mode: they stage through the SAME setters the learner's own
  // typing and picking use, so the value shows up in the form and the learner
  // still presses Make — which is where the COPPA gate, the entitlement guard
  // and the canonical studyMediaService path run. Nothing here spends quota or
  // writes a row. Fresh closures per call (getWriteHandlers contract). The list
  // and detail mounts of this same surface register NO handlers.
  const getSurfaceWriteHandlers = () => ({
    generation_source: async (value: unknown) =>
      generationSourceWrite({
      what: "a mind map",
      isBusy: isGenerating || busy,
      decks: await deckChoices.load(),
      topicMin: TOPIC_MIN_CHARS,
      topicMax: TOPIC_MAX,
      setTopic: sources.set.setTopic,
      pickDeck: (deck) => {
        if (!sources.set.hasRef("fc_set", deck.id))
          sources.intake.addExisting({ token: "fc_set", id: deck.id, title: deck.name });
      },
      })(value),
    generation_focus: (value: unknown) => {
      if (isGenerating || busy)
        throw new Error(
          "generation_focus refused — a mind map is being generated right now. Wait for the run to finish before changing the focus.",
        );
      if (typeof value !== "string")
        throw new Error("generation_focus expects a plain string (the empty string clears the focus).");
      if (value.length > FOCUS_MAX)
        throw new Error(`generation_focus expects at most ${FOCUS_MAX} characters (got ${value.length}).`);
      setFocus(value.trim());
      styleDraft.patch({ focus: value.trim() });
    },
  });

  const count = sources.ready.length;
  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/education-mind-maps"
      isEditable
      getScope={getScope}
      getWriteHandlers={getSurfaceWriteHandlers}
    >
      <EducationCreatePage
        title="New mind map"
        backHref="/education/mind-maps"
        surfaceKey={MIND_MAP_SURFACE_KEY}
        purpose="your mind map"
        extraKinds={STUDY_FROM_DECK_KINDS}
        sources={sources}
        styleDraft={styleDraft}
        onStartFresh={() => setFocus("")}
        make={{
          label: "Make the mind map",
          busyLabel: "Mapping your material…",
          icon: <Network />,
          busy: busy || isGenerating,
          checking: gen.isChecking,
          onMake: handleMake,
          summary: sources.hasSources
            ? `A map of ${count} ${count === 1 ? "source" : "sources"}${sources.topic ? `, focused on “${sources.topic}”` : ""}`
            : `A map about “${sources.topic}”`,
          error: runError,
          capability: "education.mindmap_generate",
          mandates: { feature: "education", keys: [EDU_MEDIA_MANDATES.mindMap] },
          gates: (
            <>
              <coppa.Gate />
              <gen.Paywall />
            </>
          ),
          operation: "Make a mind map",
        }}
        run={{
          state: createRun,
          stoppedLabel: "Making your mind map",
          savingWhat: "your mind map",
          listLabel: "Your mind maps",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mm-focus">
            Focus <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="mm-focus"
            value={focus}
            maxLength={FOCUS_MAX}
            onChange={(e) => {
              setFocus(e.target.value);
              styleDraft.patch({ focus: e.target.value });
            }}
            placeholder="Center the map on a specific angle…"
            disabled={busy || isGenerating}
          />
        </div>
      </EducationCreatePage>
    </SurfaceRuntimeProvider>
  );
}
