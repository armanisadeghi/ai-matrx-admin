"use client";

// features/education/assessment/data/useAssessmentGeneration.tsx
//
// THE one "generate a quiz / practice test" path: school-safe COPPA gate →
// metered entitlement check (paywall on a cap, never a started run) → the
// generator → `assessmentService.createWithItems` → lineage → record usage on
// success only. The New quiz form (`AssessmentCreate`) and the list's agent
// target (`generate_quizzes` / `generate_practice_tests`) both call `run`, so a
// person and an agent generate exactly the same way and pay exactly the same.
//
// Two generators, nothing else:
//   • topic   → the topic mandate (confidence "inferred", no citations);
//   • sources → a SourceSet resolved on the server (`POST /sources/resolve`,
//     the same door flashcards use) into THE one question generator
//     (`generateQuestionsFromSources`): cited, segmented, lineage per Source.
// A deck or a library document named by the agent target is a one-Source set.
//
// Render `<Gates />` once where the hook is used: it carries the COPPA dialog
// and the paywall, which decide for themselves when they show.

import { useState } from "react";
import { useAiComplianceGate } from "@/features/education/compliance/useAiComplianceGate";
import { useEntitlementGuard } from "@/features/entitlements/components/useEntitlementGuard";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { asSourceSet, type GenerationSource } from "./generationSource";
import { sourcesClient } from "@/features/resource-manager/source-input/sourceSetApi";
import {
  backfillFileIds,
  lineageSourcesOf,
} from "@/features/flashcards/data/generateDeckFromSources";
import { recordLineageForSources } from "@/features/education/convert/recordSourceLineage";
import { announceLineage } from "@/features/education/convert/announceLineage";
import { emptyRunMessage } from "@/features/education/convert/segmentedGenerate";
import { newBatchId } from "@/features/education/convert/steering";
import type { ConvertProgress } from "@/features/education/convert/types";
import { nameFromSources } from "@/features/education/onboard/kitTitle";
import { assessmentService } from "./assessmentService";
import { ASSESSMENT_MANDATES } from "./mandates";
import { generateQuestionsFromSources } from "./generateQuestionsFromSources";
import { useGenerateQuiz } from "./useGenerateQuiz";
import type {
  AssessmentRow,
  AssessmentSourceKind,
  Depth,
  Difficulty,
  QuestionType,
} from "./types";
import type { KindConfig } from "../components/kindConfig";

export interface GenerationRequest {
  source: GenerationSource;
  count: number;
  difficulty: Difficulty;
  depth: Depth;
  /** Empty = automatic mix. */
  questionTypes: QuestionType[];
  examType: string;
  userRequest: string;
  /** Practice tests only; 0 = untimed. */
  timeLimitMinutes: number;
  /**
   * The page's tab-bound run (`useTabBoundRun`): `saving` is awaited right
   * before the quiz is saved, `attach` gets each conversation as it exists.
   */
  tabRun?: { saving: () => Promise<void>; attach: (conversationId: string) => void };
}

export type GenerationOutcome =
  | { status: "created"; assessment: AssessmentRow; questionCount: number; gapNote?: string | null }
  /** The person was stopped before spending (COPPA dialog, paywall, plan check). */
  | { status: "blocked"; reason: string }
  | { status: "failed"; error: string };

export function useAssessmentGeneration(config: KindConfig) {
  const { generate, isGenerating: topicGenerating, conversationId: topicConversationId } = useGenerateQuiz();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  // The from-Sources run's live state (the topic run's lives in useGenerateQuiz).
  const [sourceRun, setSourceRun] = useState<{
    active?: boolean;
    conversationId: string | null;
    progress: ConvertProgress | null;
  }>({ conversationId: null, progress: null });
  const entitlement = useEntitlementGuard(config.capability);
  const coppa = useAiComplianceGate();

  const run = async (req: GenerationRequest): Promise<GenerationOutcome> => {
    if (req.source.mode === "topic") return runGated(req);
    try {
      return await runGated(req);
    } finally {
      setSourceRun((r) => ({ ...r, active: false }));
    }
  };

  const runGated = async (req: GenerationRequest): Promise<GenerationOutcome> => {
    if (!(await coppa.ensureAllowed()))
      return { status: "blocked", reason: "This account needs a parent's approval before using AI." };
    let outcome: GenerationOutcome = {
      status: "blocked",
      reason: `The ${config.noun} generations included in this plan are used up for now.`,
    };
    const verdict = await entitlement.guard(async () => {
      outcome = await generateAndSave(req);
    });
    if (!verdict.allowed && verdict.reason === "resolver_error")
      return { status: "blocked", reason: "The plan check could not be reached. Try again." };
    return outcome;
  };

  const generateAndSave = async (req: GenerationRequest): Promise<GenerationOutcome> => {
    const safeCount = Math.min(config.countMax, Math.max(1, req.count || 1));
    const examType = req.examType.trim();
    const userRequest = req.userRequest.trim();
    const timeLimitSeconds =
      config.timed && req.timeLimitMinutes > 0 ? req.timeLimitMinutes * 60 : null;
    const runConfig = {
      count: safeCount,
      difficulty: req.difficulty,
      depth: req.depth,
      questionTypes: req.questionTypes,
      examType: examType || null,
      timeLimitSeconds,
      userRequest: userRequest || null,
    };
    try {
      const src = req.source;
      if (src.mode === "topic") {
        const topic = src.topic.trim();
        const generated = await generate(ASSESSMENT_MANDATES.generateQuiz, {
          topic,
          grade_level: "",
          count: safeCount,
          difficulty: req.difficulty,
          depth: req.depth,
          question_types: req.questionTypes.join(","),
          exam_type: examType,
          user_request: userRequest,
        }, "user");
        await req.tabRun?.saving();
        const created = await assessmentService.createWithItems(
          {
            assessmentKind: config.kind,
            title: generated.title || topic || config.label,
            description: generated.description,
            status: "ready",
            sourceKind: "topic",
            sourceId: null,
            sourceTitle: null,
            topic,
            examType: examType || null,
            depth: req.depth,
            timeLimitSeconds,
            config: runConfig,
            metadata: { question_count: generated.questions.length },
          },
          generated.questions,
        );
        if (created.error || !created.data)
          return { status: "failed", error: created.error ?? `Could not save the ${config.noun}` };
        await entitlement.commit({ initiation: "user" });
        return { status: "created", assessment: created.data.assessment, questionCount: generated.questions.length };
      }

      const sourceSet = asSourceSet(src);
      if (!sourceSet || sourceSet.sources.length === 0)
        return { status: "failed", error: "Pick at least one source." };
      const focusTopic = src.mode === "sources" ? (src.topic ?? "").trim() : "";
      setSourceRun({ active: true, conversationId: null, progress: null });
      const orgId = await ensureOrgId(undefined);
      const resolve = src.mode === "sources" && src.resolve ? src.resolve : () => sourcesClient.resolve(sourceSet);
      // Citations open the real file only through its file id.
      const resolved = await backfillFileIds(await resolve());
      const dropped = resolved.dropped.map(
        (d) => d.detail ?? `One source was left out (${d.reason.replace("_", " ")}).`,
      );
      const readable = resolved.sources.filter((s) => s.text.trim().length > 0);
      const only = readable.length === 1 ? readable[0] : null;
      // Several Sources are titled by THE kit namer (an equal share of every one) — never "<first> and more".
      const title =
        only?.label ??
        (focusTopic ||
          (readable.length
            ? await nameFromSources(readable, { dispatch, store, orgId }, readable[0].label)
            : config.label));
      const made = await generateQuestionsFromSources({
        resolved,
        count: safeCount,
        difficulty: req.difficulty,
        depth: req.depth,
        examType,
        title,
        steer: {
          instruction: [focusTopic ? `Focus on: ${focusTopic}` : "", userRequest].filter(Boolean).join("\n\n") || undefined,
          questionTypes: req.questionTypes,
        },
        batchId: newBatchId(),
        targetKind: config.kind,
        surfaceKey: `education-create-${config.base}`,
        ctx: {
          initiation: "user",
          dispatch,
          store,
          orgId,
          onConversationCreated: (conversationId) => {
            req.tabRun?.attach(conversationId);
            setSourceRun((r) => ({ ...r, conversationId: r.conversationId ?? conversationId }));
          },
          onProgress: (progress: ConvertProgress) => setSourceRun((r) => ({ ...r, progress })),
        },
      });
      if (made.questions.length === 0)
        return {
          status: "failed",
          error: emptyRunMessage(
            made,
            "questions",
            made.gapNote ?? [...dropped, "Nothing came out of this material. Add other material or change the focus."].join(" "),
          ),
        };
      const finalTitle = made.singlePass ? made.agentTitle || title : title;
      await req.tabRun?.saving();
      const created = await assessmentService.createWithItems(
        {
          assessmentKind: config.kind,
          runKey: made.runKey,
          title: finalTitle,
          description: made.agentDescription,
          status: "ready",
          // The flat columns name a single Source (filters + learning gain);
          // every Source is recorded as a lineage edge below.
          sourceKind: (only?.ref.resource_type === "fc_set" ? "deck" : "source") as AssessmentSourceKind,
          sourceId: only ? (only.processed_document_id ?? only.file_id ?? only.ref.resource_id) : null,
          sourceTitle: only?.label ?? null,
          topic: focusTopic || only?.label || null,
          examType: examType || null,
          depth: req.depth,
          timeLimitSeconds,
          config: runConfig,
          metadata: {
            question_count: made.questions.length,
            source_set: sourceSet,
            ...(dropped.length ? { dropped_sources: dropped } : {}),
          },
          orgId,
        },
        made.questions,
      );
      if (created.error || !created.data)
        return { status: "failed", error: created.error ?? `Could not save the ${config.noun}` };
      const assessment = created.data.assessment;
      const result = {
        targetKind: config.kind,
        artifactId: assessment.id,
        resourceType: "assessment",
        href: `/education/${config.base}/${assessment.id}`,
        title: assessment.title,
        detail: `${made.questions.length} ${made.questions.length === 1 ? "question" : "questions"}`,
      };
      const linkSources = lineageSourcesOf({ ...resolved, sources: made.sources });
      announceLineage(
        await recordLineageForSources(result, linkSources, orgId),
        () => recordLineageForSources(result, linkSources, orgId),
      );
      // Metered action SUCCEEDED — record real usage. Failed branches return
      // first, so a failed generation never burns quota.
      await entitlement.commit({ initiation: "user" });
      return {
        status: "created",
        assessment,
        questionCount: made.questions.length,
        gapNote: [made.gapNote, ...dropped].filter(Boolean).join(" ") || null,
      };
    } catch (e) {
      return {
        status: "failed",
        error: e instanceof Error ? e.message : `Failed to generate the ${config.noun}`,
      };
    }
  };

  const Gates = () => (
    <>
      <coppa.Gate />
      <entitlement.Paywall />
    </>
  );

  return {
    run,
    isGenerating: topicGenerating || !!sourceRun.active,
    conversationId: topicConversationId ?? sourceRun.conversationId,
    /** A from-Sources run's section progress ("part 2 of 5"); null for one call. */
    progress: sourceRun.progress,
    isChecking: entitlement.isChecking,
    /** Uses left this period (`null` = unlimited) — for the approval wording. */
    remaining: entitlement.remaining,
    /** Server-truth plan check without spending. */
    check: entitlement.check,
    Gates,
  };
}
