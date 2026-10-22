// features/education/assessment/components/create/AssessmentCreate.tsx
//
// The generate-a-<quiz|practice test> surface. One component, kind-parameterized.
// Create → choose sources, style and details → results, on THE one Education
// create shell (`EducationCreatePage` + `useEducationSources` + `useCreateRun`):
//   • Sources: THE one Source input (`SourceInput`, Use existing + Add new, the
//     review above the knob), picks kept across a reload under its surfaceKey.
//     Its Topic tile alone runs the topic generator (no citations); any picked
//     Source runs THE one question generator over the server-resolved set
//     (`useAssessmentGeneration` → `/sources/resolve` → cited questions +
//     a lineage edge per Source). A flashcard deck is one more Source (Use
//     existing → Decks, an fc_set read on the server as its cards).
//   • Style and details: count, difficulty, depth, question types, exam type,
//     time limit (timed kinds), instructions — kept across a reload too.
// Generation is metered via useEntitlement — the remaining count shows BEFORE
// the action (TRUST §6).
//
// React Compiler is on: no manual useMemo / useCallback / React.memo.

"use client";

import { ClampedNumberInput } from "@/components/official/ClampedNumberInput";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { recordToast, toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FLASHCARD_SOURCE_DELIVERIES } from "@/features/flashcards/data/generateDeckFromSources";
import { createSourceRef } from "@ai-matrx/agents/sources";
import type { SourceDraft } from "@ai-matrx/agents/sources/runtime";
import { cardRunRequest, restoreCardRunRequest } from "@/features/flashcards/data/cardRunRequest";
import { sourceNamesOf } from "@/features/flashcards/data/deckSourceSet";
import { EducationCreatePage } from "@/features/education/create/EducationCreatePage";
import { leftOutLine, seedFromParams, useEducationSources } from "@/features/education/create/useEducationSources";
import { useStyleDraft } from "@/features/education/create/useStyleDraft";
import { useCreateRun } from "@/features/education/create/useCreateRun";
import { STUDY_FROM_DECK_KINDS } from "@/features/education/create/studyFromDeck";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { LiveRunDisplay } from "@ai-matrx/chat/agents/components/live-run/LiveRunDisplay";
import { createEducationAssessmentScope } from "@/features/surfaces/manifests/education-assessment.manifest";
import { ASSESSMENT_MANDATES } from "../../data/mandates";
import { useAssessmentGeneration } from "../../data/useAssessmentGeneration";
import {
  restoreAssessmentStyle,
  type AssessmentStyleDraft,
} from "../../data/createStyleDraft";
import {
  DEPTHS,
  DIFFICULTIES,
  QUESTION_TYPES,
  isDepth,
  isDifficulty,
  isQuestionType,
} from "../../data/types";
import type {
  AssessmentKind,
  Depth,
  Difficulty,
  QuestionType,
} from "../../data/types";
import { KIND_CONFIG, type KindConfig } from "../kindConfig";
import { ProTextarea } from "@/components/official/ProTextarea";
import { AGENT_ICON } from "@/components/icons/domain-icons";

const FIELD = "text-base"; // 16px+ prevents iOS zoom-on-focus

/** The Source input's key on this page — picks are kept under it across a reload. */
export function assessmentCreateSurfaceKey(base: string): string {
  return `${base}:new`;
}

/** A flashcard deck as a ready Source (read on the server as its cards). */
export function deckSourceDraft(deck: { id: string; name: string }): SourceDraft {
  return { kind: "records", label: deck.name, ref: createSourceRef("fc_set", deck.id), sourceKind: "Flashcard deck" };
}

// Presentation only — the VALUE vocabularies live in data/types.ts and are
// imported above, so these option lists cannot drift from what the surface's
// write targets advertise or what their handlers accept. The Records are keyed
// by the union, so adding a depth/question type fails to compile until it is
// given UI copy here.
const DEPTH_COPY: Record<Depth, { label: string; hint: string }> = {
  recall: { label: "Recall", hint: "Facts & definitions" },
  applied: { label: "Applied", hint: "Use the concept" },
  exam: { label: "Exam", hint: "Exam / clinical rigor" },
};
const DEPTH_OPTIONS = DEPTHS.map((value) => ({ value, ...DEPTH_COPY[value] }));

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  fill_blank: "Fill in the blank",
  short_answer: "Short answer",
  written_response: "Written response",
};
const QUESTION_TYPE_OPTIONS = QUESTION_TYPES.map((value) => ({
  value,
  label: QUESTION_TYPE_LABELS[value],
}));

/** Bounds the write handlers enforce (the form's own inputs are unbounded text). */
const TOPIC_MAX = 500;
const EXAM_TYPE_MAX = 100;
const USER_REQUEST_MAX = 2000;
const TIME_LIMIT_MAX_MIN = 600;

export function AssessmentCreate({ kind }: { kind: AssessmentKind }) {
  const config: KindConfig = KIND_CONFIG[kind];
  const router = useRouter();
  const base = `/education/${config.base}`;
  // THE one generation path (COPPA gate → plan check → generator → save →
  // usage), shared with the list's generate_<plural> agent target.
  const generation = useAssessmentGeneration(config);
  const { isGenerating, conversationId } = generation;

  const [isNavigating, startNavigation] = useTransition();

  // Exam-hub deep links (P6 Phase B CTAs) seed the create surface:
  //   /education/{quizzes|practice-tests}/new?examType=<slug>&topic=<Exam Name>&depth=exam
  // Read once for the initial state below; the user can still edit every field.
  // Requires the route to wrap this component in a <Suspense> boundary.
  const searchParams = useSearchParams();
  const seedTopic = searchParams.get("topic")?.trim() ?? "";
  const seedExamType = searchParams.get("examType")?.trim() ?? "";
  const seedDepthRaw = searchParams.get("depth")?.trim() ?? "";
  const seedDepth: Depth = isDepth(seedDepthRaw) ? seedDepthRaw : "applied";

  const surfaceKey = assessmentCreateSurfaceKey(config.base);
  const sources = useEducationSources(surfaceKey, {
    // Exam hub, deck and document links: a topic, a deck (`?deck=&name=`), a document.
    seed: { ...seedFromParams(searchParams), topic: seedTopic || null },
    onRelease: () => void start(),
    topicMinChars: 1,
    lateMark: `Not in this ${config.noun}`,
  });
  const set = sources.set;
  const defaultTime = config.timed ? 20 : 0;
  const [count, setCount] = useState(config.defaultCount);
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [depth, setDepth] = useState<Depth>(seedDepth);
  const [types, setTypes] = useState<Set<QuestionType>>(new Set());
  const [examType, setExamType] = useState(seedExamType);
  const [timeLimitMin, setTimeLimitMin] = useState(defaultTime);
  const [userRequest, setUserRequest] = useState("");
  // Never lose input: the style answers come back after a reload, said out
  // loud (the Sources and topic are kept by the Source input itself). A link's
  // own exam type / depth still win over a kept answer.
  const styleDraft = useStyleDraft<AssessmentStyleDraft>(`${surfaceKey}:style`, restoreAssessmentStyle, (v) => {
    if (v.count !== undefined) setCount(Math.min(config.countMax, v.count));
    if (v.difficulty) setDifficulty(v.difficulty);
    if (v.depth && !isDepth(seedDepthRaw)) setDepth(v.depth);
    if (v.questionTypes) setTypes(new Set(v.questionTypes));
    if (v.examType !== undefined && !seedExamType) setExamType(v.examType);
    if (v.timeLimitMinutes !== undefined && config.timed) setTimeLimitMin(v.timeLimitMinutes);
    if (v.userRequest !== undefined) setUserRequest(v.userRequest);
  });
  const keep = (fields: AssessmentStyleDraft) => styleDraft.patch({ ...fields });
  const startFresh = () => {
    setCount(config.defaultCount);
    setDifficulty("Medium");
    setDepth(seedDepth);
    setTypes(new Set());
    setExamType(seedExamType);
    setTimeLimitMin(defaultTime);
    setUserRequest("");
  };
  // The run is orchestrated in this tab (read, fan out, save): a reload mid-run
  // stops it. Its request is kept so the page says so and offers the same
  // request again — and a reload after the save began never repeats it.
  const createRun = useCreateRun(`${surfaceKey}:run`, restoreCardRunRequest, sources, {
    onRedo: (req) => {
      const n = Math.min(config.countMax, req.count);
      setCount(n);
      keep({ count: n });
    },
  });

  const busy = isGenerating || isNavigating;

  const toggleType = (t: QuestionType) => {
    const next = new Set(types);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTypes(next);
    keep({ questionTypes: Array.from(next) });
  };

  const { ready, topic, hasSources } = sources;
  const firstDeck = ready.find((s) => s.draft.ref?.resource_type === "fc_set");
  const firstOther = ready.find((s) => s.draft.ref?.resource_type !== "fc_set");

  // THE one generation path (COPPA gate → plan check → generator → save → usage).
  const start = async () => {
    try {
      const outcome = await createRun.track(
        cardRunRequest(count, set.toSourceSet(), sourceNamesOf(set.sources), topic),
        (ctx) => {
          if (hasSources) sources.begin();
          return generation.run({
            source: hasSources
              ? { mode: "sources", sources: set.toSourceSet(), topic, resolve: set.resolve }
              : { mode: "topic", topic },
            count,
            difficulty,
            depth,
            questionTypes: Array.from(types),
            examType,
            userRequest,
            timeLimitMinutes: timeLimitMin,
            tabRun: { saving: ctx.saving, attach: ctx.attach },
          });
        },
      );
      // A blocked run already showed its own dialog (COPPA / paywall) or toast.
      if (outcome.status === "failed") {
        toast.error(outcome.error);
        return;
      }
      if (outcome.status !== "created") return;
      const { assessment, questionCount } = outcome;
      recordToast.success(
        { type: "assessment", id: assessment.id, title: assessment.title },
        `Created "${assessment.title}" with ${questionCount} question${questionCount === 1 ? "" : "s"}`,
      );
      if (outcome.gapNote) toast.info(outcome.gapNote);
      // Made and saved: only the Sources it used leave the draft.
      const leftOut = sources.clearUsed();
      if (leftOut > 0) toast.info(leftOutLine(leftOut, `the ${config.noun}`));
      styleDraft.clear();
      startNavigation(() => router.push(`${base}/${assessment.id}`));
    } finally {
      sources.endRun();
    }
  };

  const handleGenerate = () => {
    if (sources.blockedReason || busy || generation.isChecking) return;
    if (sources.waitingForClean.length > 0) {
      sources.setHolding(true);
      return;
    }
    void start();
  };

  // Live surface scope for the Agents chrome (matrx-user/education-assessment,
  // create view). Plain function reading the live render values at Run time.
  const getScope = () =>
    createEducationAssessmentScope({
      assessment_kind: config.kind,
      view: "create",
      source_mode: hasSources ? "sources" : "topic",
      ...(topic.trim() ? { topic: topic.trim() } : {}),
      question_count: count,
      difficulty,
      depth,
      question_types: Array.from(types),
      ...(examType.trim() ? { exam_type: examType.trim() } : {}),
      ...(config.timed ? { time_limit_minutes: timeLimitMin } : {}),
      ...(userRequest.trim() ? { user_request: userRequest.trim() } : {}),
      ...(firstDeck?.draft.ref
        ? { selected_deck: { id: firstDeck.draft.ref.resource_id, name: firstDeck.draft.label } }
        : {}),
      ...(firstOther?.draft.ref
        ? { selected_document: { id: firstOther.draft.ref.resource_id, name: firstOther.draft.label } }
        : {}),
      is_generating: isGenerating,
    });

  // Write half of the assessment surface (manifest `writeTargets`). Every
  // target is draft-mode: it stages through the SAME setters the user's own
  // typing uses, so the value shows up in the form and the user still presses
  // Generate — which is where the COPPA gate, the entitlement guard and the
  // canonical assessmentService write path run. Nothing here spends quota or
  // writes a row. Handlers validate against the canonical vocabularies
  // (data/types.ts) and THROW on a bad shape; the writeback seam turns a throw
  // into a safe error envelope the agent reads. Fresh closures per call
  // (getWriteHandlers contract). The detail/take mount of this same surface
  // registers NO handlers — see the manifest's writeTargets docblock.
  const getSurfaceWriteHandlers = () => ({
    generation_topic: (value: unknown) => {
      if (typeof value !== "string" || !value.trim() || value.length > TOPIC_MAX)
        throw new Error(
          `generation_topic expects a non-empty string of at most ${TOPIC_MAX} characters.`,
        );
      // The Source input's Topic: alone it is the subject; beside picked
      // Sources it narrows them ("Focus on: …").
      set.setTopic(value.trim());
    },
    generation_difficulty: (value: unknown) => {
      if (typeof value !== "string" || !isDifficulty(value))
        throw new Error(
          `generation_difficulty expects exactly one of: ${DIFFICULTIES.join(", ")} (case-sensitive).`,
        );
      setDifficulty(value);
      keep({ difficulty: value });
    },
    generation_depth: (value: unknown) => {
      if (typeof value !== "string" || !isDepth(value))
        throw new Error(
          `generation_depth expects exactly one of: ${DEPTHS.join(", ")}.`,
        );
      setDepth(value);
      keep({ depth: value });
    },
    generation_question_types: (value: unknown) => {
      if (!Array.isArray(value))
        throw new Error(
          `generation_question_types expects an array of strings drawn from: ${QUESTION_TYPES.join(", ")}. It replaces the full deck; [] means an automatic mix.`,
        );
      const bad = value.filter((t) => typeof t !== "string" || !isQuestionType(t));
      if (bad.length > 0)
        throw new Error(
          `generation_question_types rejected — unsupported question type(s): ${bad.map((t) => JSON.stringify(t)).join(", ")}. Allowed: ${QUESTION_TYPES.join(", ")}.`,
        );
      setTypes(new Set(value as QuestionType[]));
      keep({ questionTypes: value as QuestionType[] });
    },
    generation_question_count: (value: unknown) => {
      if (!Number.isInteger(value) || (value as number) < 1)
        throw new Error(
          "generation_question_count expects a whole number of at least 1.",
        );
      if ((value as number) > config.countMax)
        throw new Error(
          `generation_question_count of ${value} exceeds the maximum for a ${config.noun} (${config.countMax}).`,
        );
      setCount(value as number);
      keep({ count: value as number });
    },
    generation_exam_type: (value: unknown) => {
      if (typeof value !== "string" || value.length > EXAM_TYPE_MAX)
        throw new Error(
          `generation_exam_type expects a string of at most ${EXAM_TYPE_MAX} characters (the empty string clears it).`,
        );
      setExamType(value.trim());
      keep({ examType: value.trim() });
    },
    generation_user_request: (value: unknown) => {
      if (typeof value !== "string" || value.length > USER_REQUEST_MAX)
        throw new Error(
          `generation_user_request expects a string of at most ${USER_REQUEST_MAX} characters (the empty string clears it).`,
        );
      setUserRequest(value);
      keep({ userRequest: value });
    },
    generation_time_limit_minutes: (value: unknown) => {
      if (!config.timed)
        throw new Error(
          `generation_time_limit_minutes does not apply to a ${config.noun} — only timed kinds (practice tests) have a time limit, and this form has no such control.`,
        );
      if (
        !Number.isInteger(value) ||
        (value as number) < 0 ||
        (value as number) > TIME_LIMIT_MAX_MIN
      )
        throw new Error(
          `generation_time_limit_minutes expects a whole number of minutes between 0 and ${TIME_LIMIT_MAX_MIN} (0 means untimed).`,
        );
      setTimeLimitMin(value as number);
      keep({ timeLimitMinutes: value as number });
    },
  });

  const n = Math.min(config.countMax, Math.max(1, count || 1));
  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/education-assessment"
      isEditable
      getScope={getScope}
      getWriteHandlers={getSurfaceWriteHandlers}
    >
      <EducationCreatePage
        title={`New ${config.label.toLowerCase()}`}
        backHref={base}
        surfaceKey={surfaceKey}
        purpose={`your ${config.noun}`}
        deliveries={FLASHCARD_SOURCE_DELIVERIES}
        extraKinds={STUDY_FROM_DECK_KINDS}
        sources={sources}
        styleDraft={styleDraft}
        onStartFresh={startFresh}
        make={{
          title: `Make the ${config.noun}`,
          label: "Generate",
          busyLabel: `Generating your ${config.noun}…`,
          icon: <AGENT_ICON />,
          busy,
          checking: generation.isChecking,
          running: (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm font-medium text-foreground">
                  {isNavigating
                    ? `Opening your ${config.noun}…`
                    : generation.progress && generation.progress.total > 1
                      ? `Generating your ${config.noun} · part ${Math.min(generation.progress.done + 1, generation.progress.total)} of ${generation.progress.total}`
                      : `Generating ${n} ${n === 1 ? "question" : "questions"} at ${depth} depth…`}
                </p>
              </div>
              {/* The generator's stream renders live — never a bare spinner. */}
              <LiveRunDisplay
                conversationId={conversationId}
                label={`Writing your ${config.noun}`}
                pending
                bodyClassName="max-h-80 overflow-y-auto px-2.5 py-2 text-sm"
              />
            </div>
          ),
          onMake: handleGenerate,
          summary: hasSources
            ? `${n} ${n === 1 ? "question" : "questions"} from ${ready.length} ${ready.length === 1 ? "source" : "sources"}${topic ? `, focused on “${topic}”` : ""}`
            : `${n} ${n === 1 ? "question" : "questions"} about “${topic}”`,
          capability: config.capability,
          mandates: {
            feature: "education",
            keys: [ASSESSMENT_MANDATES.generateQuiz, ASSESSMENT_MANDATES.generateQuizFromSource],
          },
          gates: <generation.Gates />,
          operation: `Make a ${config.noun}`,
        }}
        run={{
          state: createRun,
          stoppedLabel: createRun.stopped
            ? `Making ${createRun.stopped.request.count} ${createRun.stopped.request.count === 1 ? "question" : "questions"}`
            : "",
          savingWhat: `your ${config.noun}`,
          listLabel: `Your ${config.pluralLabel.toLowerCase()}`,
        }}
      >
            {/* Count + difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="as-count">Questions</Label>
                <ClampedNumberInput
                  id="as-count"
                  min={1}
                  max={config.countMax}
                  value={count}
                  onChange={(v) => {
                    setCount(v);
                    keep({ count: v });
                  }}
                  className={FIELD}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="as-diff">Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => {
                    setDifficulty(v as Difficulty);
                    keep({ difficulty: v as Difficulty });
                  }}
                >
                  <SelectTrigger id="as-diff" className={FIELD}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Depth-on-demand */}
            <div className="flex flex-col gap-1.5">
              <Label>Depth</Label>
              <div className="grid grid-cols-3 gap-2">
                {DEPTH_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setDepth(d.value);
                      keep({ depth: d.value });
                    }}
                    className={cn(
                      "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
                      depth === d.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40",
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {d.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {d.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question type mix */}
            <div className="flex flex-col gap-1.5">
              <Label>Question types</Label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPE_OPTIONS.map((t) => (
                  <label
                    key={t.value}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                      types.has(t.value)
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/40",
                    )}
                  >
                    <Checkbox
                      checked={types.has(t.value)}
                      onCheckedChange={() => toggleType(t.value)}
                      className="h-3.5 w-3.5"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave all unchecked for a smart automatic mix.
              </p>
            </div>

            {/* Exam type + time limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="as-exam">Exam type (optional)</Label>
                <Input
                  id="as-exam"
                  value={examType}
                  onChange={(e) => {
                    setExamType(e.target.value);
                    keep({ examType: e.target.value });
                  }}
                  placeholder="e.g. AP Biology, SAT"
                  className={FIELD}
                />
              </div>
              {config.timed && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="as-time">Time limit (minutes)</Label>
                  <ClampedNumberInput
                    id="as-time"
                    min={0}
                    value={timeLimitMin}
                    onChange={(v) => {
                      setTimeLimitMin(v);
                      keep({ timeLimitMinutes: v });
                    }}
                    className={FIELD}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="as-req">Extra instructions (optional)</Label>
              <ProTextarea
                id="as-req"
                value={userRequest}
                onChange={(e) => {
                  setUserRequest(e.target.value);
                  keep({ userRequest: e.target.value });
                }}
                placeholder="e.g. Emphasize mechanisms; one case study"
                className={cn(FIELD, "min-h-[60px]")}
              />
            </div>

      </EducationCreatePage>
    </SurfaceRuntimeProvider>
  );
}
