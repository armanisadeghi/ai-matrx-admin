"use client";

// features/education/spoken-practice/components/PracticeSetup.tsx
//
// Create page for one mode, on THE one Education create shell
// (`EducationCreatePage` + `useEducationSources` + `useCreateRun`): 1 Sources
// (the ONE Source input — a deck, a web page, pasted text, files…; optional),
// 2 Style and details (the required focus — subject / interview type /
// resolution —, level, question count), 3 Start. A reload while the session is
// being designed says so and offers the same request (stopped notice → Try
// again).
// The chosen SourceSet is resolved by the server (POST /sources/resolve) and
// recorded on the session as its lineage. The metered start is guarded + the
// limit is shown BEFORE the cap (TRUST mandate) via the canonical entitlement
// primitives.

import { useEffect, useState } from "react";
import { ArrowLeft, Mic } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Select } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { createSourceRef } from "@ai-matrx/agents/sources";
import { ALL_SOURCE_KIND_IDS, type SourceInputKindId } from "@/features/resource-manager/source-input/sourceKinds";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { nameFromSources } from "@/features/education/onboard/kitTitle";
import { EducationCreatePage } from "@/features/education/create/EducationCreatePage";
import { useEducationSources } from "@/features/education/create/useEducationSources";
import { useStyleDraft } from "@/features/education/create/useStyleDraft";
import { useCreateRun } from "@/features/education/create/useCreateRun";
import { restoreStudyRunRequest } from "@/features/education/create/createRunRequest";
import { namerFloorOf } from "@/features/education/create/groundedMaterial";
import { STUDY_FROM_DECK_KINDS } from "@/features/education/create/studyFromDeck";
import { useEntitlementGuard } from "@/features/entitlements/components/useEntitlementGuard";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import {
  StudyOrganizationHoldNotice,
  useHeldStudyStart,
} from "@/features/education/study/components/StudyOrganizationGate";
import type { FcSetRow } from "@/features/flashcards/data/types";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  MODE_CONFIG,
  DIFFICULTY_OPTIONS,
  DEFAULT_PROMPTS,
  PROMPT_COUNT_OPTIONS,
} from "../constants";
import { practiceDesignerModelId } from "../data/designerModel";
import { practiceSourceFromResolved } from "../data/practiceSources";
import {
  publishPracticeSetupSnapshot,
  type PracticeSetupSnapshot,
} from "../setupSnapshot";
import { resolvePracticeSetupPatch } from "../setupWrites";
import type { PracticeConfig, SpokenPracticeMode } from "../types";

const SURFACE_NAME = "matrx-user/education-practice-oral";

/** The focus is the topic, so "Just a topic" is not offered as a Source. */
const PRACTICE_SOURCE_KINDS: readonly SourceInputKindId[] =
  ALL_SOURCE_KIND_IDS.filter((k) => k !== "topic");
/** The designer needs the text up front. */
const PRACTICE_SOURCE_DELIVERIES = ["direct"] as const;
/** The name a pasted passage written by the assistant is filed under. */
const PASTED_NAME = "Pasted material";

/** The surface key the Source input holds this mode's picks under. */
export const practiceSourceKey = (mode: SpokenPracticeMode) =>
  `education-practice-oral:${mode}`;
const practiceStyleDraftId = (mode: SpokenPracticeMode) =>
  `education-practice-oral:${mode}:style`;

interface StyleDraft {
  focus?: string;
  difficulty?: string;
  count?: number;
}

/** Map the stored bag back to the form — refusing (and naming) anything unknown. */
export function restorePracticeStyleDraft(data: Record<string, unknown>): {
  values: StyleDraft;
  rejectedKeys: string[];
} {
  const values: StyleDraft = {};
  const rejectedKeys: string[] = [];
  for (const [key, v] of Object.entries(data)) {
    if (key === "focus" && typeof v === "string") values.focus = v;
    else if (key === "difficulty" && typeof v === "string" && (DIFFICULTY_OPTIONS as readonly string[]).includes(v)) values.difficulty = v;
    else if (key === "count" && typeof v === "number" && (PROMPT_COUNT_OPTIONS as readonly number[]).includes(v)) values.count = v;
    else rejectedKeys.push(key);
  }
  return { values, rejectedKeys };
}

export function PracticeSetup({
  mode,
  onBack,
  start,
  initialDeckId,
}: {
  mode: SpokenPracticeMode;
  onBack: () => void;
  start: (config: PracticeConfig) => Promise<boolean>;
  /** Deep-linked deck (a deck detail page's "Oral practice" door). */
  initialDeckId?: string | null;
}) {
  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;
  const guard = useEntitlementGuard("education.spoken_practice");
  // School-safe COPPA gate: an under-13 account with no active guardian link is
  // blocked from AI generation until a parent approves (never a silent failure).
  const coppa = useAiComplianceGate();

  const dispatch = useAppDispatch();
  const store = useAppStore();

  const [focus, setFocus] = useState("");
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTY_OPTIONS[1]);
  const [count, setCount] = useState(DEFAULT_PROMPTS);
  const [decks, setDecks] = useState<FcSetRow[]>([]);
  const [busy, setBusy] = useState(false);
  // What the assistant last wrote as pasted material (read back by the surface).
  const [pasted, setPasted] = useState("");

  // The focus is the subject, so Sources are optional; a deep-linked deck (a
  // deck page's "Oral practice" door) is picked, read by its id.
  const sources = useEducationSources(practiceSourceKey(mode), {
    seed: initialDeckId ? { deckId: initialDeckId } : null,
    optional: true,
    onRelease: () => heldStart.start(),
    lateMark: "Not in this session",
  });
  const set = sources.set;
  const intake = sources.intake;

  // Never lose input: the style answers come back after a reload, said out loud
  // (the Sources are kept by the Source input itself).
  const styleDraft = useStyleDraft<StyleDraft>(practiceStyleDraftId(mode), restorePracticeStyleDraft, (v) => {
    if (v.focus !== undefined) setFocus(v.focus);
    if (v.difficulty) setDifficulty(v.difficulty);
    if (v.count !== undefined) setCount(v.count);
  });
  const keep = (fields: StyleDraft) => styleDraft.patch({ ...fields });

  // Designing the session runs in this tab: a reload mid-design says so and
  // offers the same request (the session row is only written by the first
  // graded answer, so a redo never makes a second one).
  const createRun = useCreateRun(
    `${practiceSourceKey(mode)}:run`,
    restoreStudyRunRequest(restorePracticeStyleDraft, { subjectInStyle: true }),
    sources,
    {
      onRedo: ({ style }) => {
        if (style.focus !== undefined) setFocus(style.focus);
        if (style.difficulty) setDifficulty(style.difficulty);
        if (style.count !== undefined) setCount(style.count);
      },
    },
  );

  // The learner's decks — named for the assistant (`available_decks`) and for
  // the deep link; the Source input's Use existing lists them for the learner.
  useEffect(() => {
    if (!cfg.offersDeckGrounding) return;
    let alive = true;
    void (async () => {
      const { fcService } =
        await import("@/features/flashcards/data/fcService");
      const res = await fcService.listDecks();
      if (alive && res.data) setDecks(res.data);
    })();
    return () => {
      alive = false;
    };
  }, [cfg.offersDeckGrounding]);

  const ready = sources.ready;
  const deckId =
    ready.find((s) => s.draft.ref?.resource_type === "fc_set")?.draft.ref
      ?.resource_id ?? "";

  // ── Surface: the setup half of `matrx-user/education-practice-oral` ────
  //
  // The form state lives here, so this component publishes it into the module
  // snapshot store the emitter (SpokenPracticeSurface) reads back synchronously,
  // and registers the `practice_setup` write handler itself. Both are scoped to
  // this component's life: the snapshot is CLEARED on unmount and the handler
  // registration is dropped with it, so the runner and the summary neither emit
  // a form that is gone nor offer an agent a target for one.
  const surfaceSnapshot = (): PracticeSetupSnapshot => ({
    mode,
    focus,
    difficulty,
    count,
    deckId,
    pasted,
    offersDeckGrounding: cfg.offersDeckGrounding,
    decks: decks.map((d) => ({ id: d.id, name: d.name })),
    busy,
  });

  useEffect(() => {
    publishPracticeSetupSnapshot(surfaceSnapshot());
  }, [
    mode,
    focus,
    difficulty,
    count,
    deckId,
    pasted,
    cfg.offersDeckGrounding,
    decks,
    busy,
  ]);

  useEffect(() => () => publishPracticeSetupSnapshot(null), []);

  /**
   * The value is validated by the ONE validator in `../setupWrites.ts` — which
   * reads the same DIFFICULTY_OPTIONS / PROMPT_COUNT_OPTIONS the pickers below
   * render — and is then applied through the SAME setters (and the same Source
   * input core) the learner's own typing and picking go through. Never a
   * parallel write path, and never a direct service call. A bad shape throws,
   * and the writeback seam turns that into the error envelope the agent reads.
   *
   * It fills the form and stops. Pressing Start is the learner's — it spends an
   * agent run, opens the microphone, and meters their entitlement.
   */
  useSurfaceWriteHandlers(SURFACE_NAME, {
    practice_setup: (value: unknown) => {
      const patch = resolvePracticeSetupPatch(value, surfaceSnapshot());
      if (patch.focus !== undefined) {
        setFocus(patch.focus);
        keep({ focus: patch.focus });
      }
      if (patch.difficulty !== undefined) {
        setDifficulty(patch.difficulty);
        keep({ difficulty: patch.difficulty });
      }
      if (patch.count !== undefined) {
        setCount(patch.count);
        keep({ count: patch.count });
      }
      if (patch.deckId !== undefined) {
        for (const s of set.sources) {
          if (s.draft.ref?.resource_type === "fc_set") set.remove(s.id);
        }
        const deck = decks.find((d) => d.id === patch.deckId);
        if (deck) {
          set.addReady({
            kind: "records",
            label: deck.name,
            ref: createSourceRef("fc_set", deck.id),
          });
        }
      }
      if (patch.pasted !== undefined) {
        for (const s of set.sources) {
          if (s.draft.label === PASTED_NAME) set.remove(s.id);
        }
        setPasted(patch.pasted);
        if (patch.pasted.trim()) void intake.addPastedText(patch.pasted, PASTED_NAME);
      }
    },
  });

  async function handleStart() {
    if (!focus.trim()) {
      toast.error(`Enter a ${cfg.focusLabel.toLowerCase()} first`);
      return;
    }
    if (sources.blockedReason) {
      toast.info(sources.blockedReason);
      return;
    }
    // School-safe gate FIRST (COPPA): is this account allowed to collect/process
    // data at all? An unconsented under-13 opens the "a parent must approve"
    // dialog and never reaches the billing gate or starts a session.
    if (!(await coppa.ensureAllowed())) return;
    setBusy(true);
    try {
      await createRun.track(sources.runRequest({ focus, difficulty, count }), async () => {
        // Resolve the grounding on the server: the chosen SourceSet in, the
        // readable text out (a deck's cards, a page's clean text, pasted text).
        let source: PracticeConfig["source"] = null;
        if (ready.length > 0) {
          let read;
          try {
            read = await sources.resolveChosen();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Your sources could not be read. Try again.");
            return;
          }
          if (read.notes.length) toast.info(read.notes.join(" "));
          // Several Sources are titled by THE kit namer; one keeps its own name.
          const title = await nameFromSources(
            read.resolved.sources,
            { dispatch, store, orgId: await ensureOrgId(undefined) },
            namerFloorOf(read.resolved.sources),
          );
          const made = practiceSourceFromResolved(read.resolved, read.chosen, read.names, title);
          source = made.source;
          if (!source) {
            toast.error("Your sources have no readable text — continuing ungrounded");
          } else if (made.cut) {
            toast.info("A long source was cut to fit. Review what goes in to choose parts.");
          }
        }

        const config: PracticeConfig = {
          mode,
          focus: focus.trim(),
          difficulty,
          count,
          source,
        };
        await guard.guard(async () => {
          // Meter only a session that actually started; a failed start (bad
          // design, mic denied, save error) returns false and burns nothing.
          if (await start(config)) await guard.commit({ initiation: "user" });
        });
      });
    } finally {
      sources.endRun();
      setBusy(false);
    }
  }
  // The setup stays usable with no organization chosen; only Start holds. A
  // session is filed under one organization, so Start with none shows the
  // organization notice here and the session starts once one is picked.
  const heldStart = useHeldStudyStart(handleStart);

  const handleMake = () => {
    if (busy || guard.isChecking) return;
    if (sources.waitingForClean.length > 0) {
      sources.setHolding(true);
      return;
    }
    heldStart.start();
  };

  const n = ready.length;
  return (
    <EducationCreatePage
      title={cfg.label}
      backHref="/education/practice-oral"
      embedded
      lead={
        <>
          <div className="flex items-center gap-3">
            <Button icon={<ArrowLeft />} variant="quiet" onClick={onBack} aria-label="Back" />
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{cfg.label}</h1>
                <p className="text-xs text-muted-foreground">{cfg.tagline}</p>
              </div>
            </div>
          </div>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {cfg.howItWorks}
          </p>
        </>
      }
      sourcesTitle="What should the session come from?"
      surfaceKey={practiceSourceKey(mode)}
      purpose="your practice session"
      kinds={PRACTICE_SOURCE_KINDS}
      extraKinds={STUDY_FROM_DECK_KINDS}
      deliveries={PRACTICE_SOURCE_DELIVERIES}
      sources={sources}
      styleDraft={styleDraft}
      onStartFresh={() => {
        setFocus("");
        setDifficulty(DIFFICULTY_OPTIONS[1]);
        setCount(DEFAULT_PROMPTS);
      }}
      make={{
        title: "Start",
        label: `Start ${cfg.label.toLowerCase()}`,
        busyLabel: "Designing your session…",
        icon: <Mic />,
        busy,
        checking: guard.isChecking,
        onMake: handleMake,
        notices: heldStart.held ? <StudyOrganizationHoldNotice what="Starting this practice session" /> : null,
        summary: `${count} questions${n > 0 ? ` from ${n} ${n === 1 ? "source" : "sources"}` : ""}`,
        capability: "education.spoken_practice",
        meterAllWindows: false,
        gates: (
          <>
            <guard.Paywall />
            <coppa.Gate />
          </>
        ),
        operation: `Start ${cfg.label.toLowerCase()}`,
      }}
      run={{
        state: createRun,
        stoppedLabel: `Designing your ${cfg.label.toLowerCase()}`,
        savingWhat: "your session",
        listLabel: "Spoken Practice",
      }}
    >
          <ProInput
            floatingLabel={cfg.focusLabel}
            value={focus}
            onChange={(e) => {
              setFocus(e.target.value);
              keep({ focus: e.target.value });
            }}
            placeholder={cfg.focusPlaceholder}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Level
              </span>
              <Select
                value={difficulty}
                onValueChange={(v) => {
                  setDifficulty(v);
                  keep({ difficulty: v });
                }}
                aria-label="Level"
                className="w-full"
                options={DIFFICULTY_OPTIONS.map((d) => ({ value: d, label: d }))}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Questions
              </span>
              <Select
                value={String(count)}
                onValueChange={(v) => {
                  setCount(Number(v));
                  keep({ count: Number(v) });
                }}
                aria-label="Questions"
                className="w-full"
                options={PROMPT_COUNT_OPTIONS.map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
              />
            </label>
          </div>
    </EducationCreatePage>
  );
}

