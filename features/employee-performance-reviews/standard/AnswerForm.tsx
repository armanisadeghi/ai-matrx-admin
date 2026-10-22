"use client";

// One half of a standard review (the self form or the manager form), built from the cycle's frozen
// template snapshot out of the same question components the review demo uses (ListEditor,
// RatingScale, ProTextarea). Edits autosave through save_response (debounced, with the version the
// server handed back); Submit flushes the last edit first and shows any `answers_incomplete`
// problems under the question they name.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button } from "@ai-matrx/design-system/controls";

import { ProTextarea } from "@/components/official/ProTextarea";
import { Field, ListEditor, RatingScale } from "@/features/employee-performance-reviews/components/review-form-components";
import { isRatingValue } from "@/features/employee-performance-reviews/schema";
import { toast } from "@/lib/toast";

import { problemMessage } from "./messages";
import { createDraftSaver, type DraftSaver } from "./draftSaver";
import { saveResponse, submitResponse } from "./service";
import { GOAL_STATUS_LABEL, type GoalStatus } from "./goals";
import type { AnswerProblem, ResponseRole, ReviewAnswers, ReviewGoal, TemplateQuestion, TemplateSnapshot } from "./types";
import { emptyAnswers } from "./types";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useSurfaceScopeContribution, useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { HR_REVIEW_WORKSPACE_SURFACE } from "@/features/surfaces/manifests/hr-review-workspace.manifest";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
const AUTOSAVE_MS = 1200;
type SaveState = "idle" | "saving" | "saved" | "error";

/** key -> the words the person sees for a problem's `question` (a question, or `category.item`). */
export function labelMap(template: TemplateSnapshot): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of template.sections)
    for (const q of s.questions) {
      m.set(q.key, q.label);
      for (const i of q.items) m.set(`${q.key}.${i.key}`, `${q.label}, ${i.label}`);
    }
  return m;
}

export function AnswerForm({
  reviewId,
  role,
  template,
  initialAnswers,
  initialVersion,
  canSubmit,
  subjectName,
  goals = [],
  onSubmitted,
  onConflict,
}: {
  reviewId: string;
  role: ResponseRole;
  template: TemplateSnapshot;
  initialAnswers: ReviewAnswers | null;
  initialVersion: number | null;
  canSubmit: boolean;
  subjectName: string;
  /** The employee's goals overlapping the cycle, for a "review of goals" question. */
  goals?: ReviewGoal[];
  onSubmitted: () => void;
  onConflict: () => void;
}) {
  const [answers, setAnswers] = useState<ReviewAnswers>(() => initialAnswers ?? emptyAnswers());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [problems, setProblems] = useState<AnswerProblem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const labels = useMemo(() => labelMap(template), [template]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [conflict, setConflict] = useState(false);
  const saver = useRef<DraftSaver | null>(null);
  if (saver.current === null) {
    saver.current = createDraftSaver(
      (a, v) => saveResponse(reviewId, role, a, v),
      { answers, version: initialVersion },
      (st) => {
        setSaveState(st.status === "conflict" ? "error" : st.status);
        setSaveError(st.status === "conflict" ? null : st.error);
        setConflict(st.status === "conflict");
      },
    );
  }
  const persist = useCallback(() => saver.current!.flush(), []);

  const change = useCallback(
    (next: ReviewAnswers) => {
      saver.current!.edit(next);
      setAnswers(next);
      setProblems([]);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), AUTOSAVE_MS);
    },
    [persist],
  );

  useEffect(
    () => () => {
      // Leaving with an unsaved edit: save it now rather than lose it (a conflict keeps it unsaved, said on screen).
      if (timer.current) {
        clearTimeout(timer.current);
        if (saver.current!.hasUnsaved()) void persist();
      }
    },
    [persist],
  );

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timer.current) clearTimeout(timer.current);
    const saved = await persist();
    if (saved && !saved.ok) {
      setSubmitting(false);
      toast.error(saved.message);
      return;
    }
    const r = await submitResponse(reviewId, role);
    setSubmitting(false);
    if (!r.ok) {
      if (r.problems && r.problems.length > 0) setProblems(r.problems);
      toast.error(r.problems && r.problems.length > 0 ? "A few answers are still missing. They are marked below." : r.message);
      return;
    }
    toast.success(role === "self" ? "Self review submitted" : role === "peer" ? "Feedback sent" : "Your review is submitted");
    onSubmitted();
  };

  // The form on screen, for the review page's surface (`hr-review-workspace`).
  useSurfaceScopeContribution(HR_REVIEW_WORKSPACE_SURFACE, "review-answer-form", () => ({
    answers_in_progress: { role, answers: { lists: answers.lists, ratings: answers.ratings, texts: answers.texts }, save_state: saveState, can_submit: canSubmit },
  }));
  useSurfaceWriteHandlers(HR_REVIEW_WORKSPACE_SURFACE, {
    review_answers: {
      validate: (value: unknown) => {
        mergeAgentAnswers(answers, value, template, goals);
      },
      apply: (value: unknown) => {
        const next = mergeAgentAnswers(answers, value, template, goals);
        change(next);
        return { summary: "The form is filled in and autosaving. It is not submitted.", data: { role } };
      },
    },
  });

  const scope = useCallback(() => ({ context: { surface: "hr-standard-performance-review", part: role, employee: subjectName } }), [role, subjectName]);
  const problemsFor = (key: string) => problems.filter((p) => p.question === key);

  const renderQuestion = (q: TemplateQuestion) => {
    if (q.type === "narrative_list" || q.type === "responsibilities") {
      const items = answers.lists[q.key] ?? [];
      const setItems = (next: string[]) => change({ ...answers, lists: { ...answers.lists, [q.key]: next } });
      return (
        <ListEditor
          items={items}
          maxItems={q.maxItems ?? 5}
          placeholder={q.type === "responsibilities" ? "A core responsibility of this role" : `Add to ${q.label.toLowerCase()}`}
          onAdd={(text) => setItems([...items, text.trim()])}
          onEdit={(i, text) => setItems(items.map((x, idx) => (idx === i ? text.trim() : x)))}
          onRemove={(i) => setItems(items.filter((_, idx) => idx !== i))}
          onMove={(i, dir) => {
            const j = i + dir;
            if (j < 0 || j >= items.length) return;
            const next = [...items];
            [next[i], next[j]] = [next[j]!, next[i]!];
            setItems(next);
          }}
          surfaceName="hr-standard-performance-review"
          getApplicationScope={scope}
        />
      );
    }
    if (q.type === "goal_review") {
      if (goals.length === 0) return <p className="text-sm text-muted-foreground">No goals overlap this review period.</p>;
      return (
        <div className="space-y-3">
          {goals.map((g) => {
            const value = answers.ratings[g.answerKey];
            return (
              <div key={g.goalId} className="space-y-2 rounded-md border border-border p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">{g.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {GOAL_STATUS_LABEL[g.status as GoalStatus] ?? g.status} · {Math.round(g.progress)}%
                  </span>
                </div>
                <RatingScale value={isRatingValue(value) ? value : undefined} onSelect={(v) => change({ ...answers, ratings: { ...answers.ratings, [g.answerKey]: v } })} />
                <ProTextarea
                  value={answers.texts[g.answerKey] ?? ""}
                  onChange={(e) => change({ ...answers, texts: { ...answers.texts, [g.answerKey]: e.target.value } })}
                  placeholder="Comment on this goal"
                  minHeight={64}
                  maxHeight={320}
                  surfaceName="hr-standard-performance-review"
                  getApplicationScope={scope}
                  enableTextStats={false}
                  className="min-h-[64px] resize-y text-base sm:text-sm"
                />
              </div>
            );
          })}
        </div>
      );
    }
    if (q.type === "rating") {
      return (
        <div className="divide-y divide-border">
          {q.items.map((item) => {
            const key = `${q.key}.${item.key}`;
            const value = answers.ratings[key];
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-sm">{item.label}</span>
                <RatingScale
                  value={isRatingValue(value) ? value : undefined}
                  onSelect={(v) => change({ ...answers, ratings: { ...answers.ratings, [key]: v } })}
                />
                {problemsFor(key).map((p) => (
                  <p key={p.problem} role="alert" className="basis-full text-xs text-destructive">
                    {problemMessage(p, (k) => labels.get(k) ?? k)}
                  <ErrorAlchemyMenu /></p>
                ))}
              </div>
            );
          })}
          <p className="pt-2 text-[11px] text-muted-foreground">{template.ratingPoints.map((p) => `${p.value} ${p.label}`).join("  ·  ")}</p>
        </div>
      );
    }
    return (
      <ProTextarea
        value={answers.texts[q.key] ?? ""}
        onChange={(e) => change({ ...answers, texts: { ...answers.texts, [q.key]: e.target.value } })}
        placeholder={q.label}
        minHeight={96}
        maxHeight={480}
        surfaceName="hr-standard-performance-review"
        getApplicationScope={scope}
        enableTextStats={false}
        className="min-h-[96px] resize-y text-base sm:text-sm"
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={role === "manager" ? "primary" : "info"}>{role === "self" ? "Your self review" : role === "peer" ? `Your feedback on ${subjectName}` : `Your review of ${subjectName}`}</Badge>
        <span data-error-box aria-live="polite" className="text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : "Saves as you type"}
        <ErrorAlchemyMenu /></span>
      </div>
      {conflict ? (
        <div role="alert" className="space-y-2 rounded-md border border-border bg-card p-3 text-sm">
          <p>This review was changed somewhere else while you were writing. Your text is still here.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onConflict}>
              Load latest
            </Button>
            <Button variant="primary" onClick={() => void saver.current!.keepMine()}>
              Keep mine
            </Button>
          </div>
        <ErrorAlchemyMenu /></div>
      ) : null}
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        <ErrorAlchemyMenu error={saveError} /></p>
      ) : null}
      {problems.length > 0 ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-card p-3 text-sm">
          <p className="font-medium">To submit, fix these</p>
          <ul className="list-disc pl-5">
            {problems.map((p, i) => (
              <li key={`${p.question}-${p.problem}-${i}`}>{problemMessage(p, (k) => labels.get(k) ?? k)}</li>
            ))}
          </ul>
        <ErrorAlchemyMenu /></div>
      ) : null}
      {template.sections.map((section, index) => (
        <SectionCard bodyClassName="p-4 pt-3" key={section.key} badge={index + 1} title={section.title} about={section.description ?? undefined} anchor={`section-${section.key}`}>
          <div className="space-y-4">
            {section.questions.map((q) => (
              <Field key={q.key} label={q.label} anchor={`question-${q.key}`}>
                {renderQuestion(q)}
                {q.type !== "rating"
                  ? problemsFor(q.key).map((p) => (
                      <p key={p.problem} role="alert" className="text-xs text-destructive">
                        {problemMessage(p, (k) => labels.get(k) ?? k)}
                      <ErrorAlchemyMenu /></p>
                    ))
                  : null}
              </Field>
            ))}
          </div>
        </SectionCard>
      ))}
      {canSubmit ? (
        <div className="flex justify-end">
          <Button variant="primary" disabled={submitting} onClick={() => void submit()}>
            {role === "self" ? "Submit self review" : role === "peer" ? "Send feedback" : "Submit your review"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** The `review_answers` value merged onto the form; throws the sentence the agent reads. */
function mergeAgentAnswers(current: ReviewAnswers, value: unknown, template: TemplateSnapshot, goals: ReviewGoal[]): ReviewAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) refuseSurfaceWrite('Send { "lists"?, "ratings"?, "texts"? }.');
  const v = value as Record<string, unknown>;
  const extra = Object.keys(v).filter((k) => k !== "lists" && k !== "ratings" && k !== "texts");
  if (extra.length) refuseSurfaceWrite(`Unknown key ${extra.join(", ")}: send lists, ratings or texts.`);
  const questions = template.sections.flatMap((sec) => sec.questions);
  const listQ = new Map(questions.filter((q) => q.type === "narrative_list" || q.type === "responsibilities").map((q) => [q.key, q]));
  const ratingKeys = new Set([
    ...questions.filter((q) => q.type === "rating").flatMap((q) => q.items.map((i) => `${q.key}.${i.key}`)),
    ...goals.map((g) => g.answerKey),
  ]);
  const textKeys = new Set([...questions.filter((q) => q.type !== "rating" && !listQ.has(q.key)).map((q) => q.key), ...goals.map((g) => g.answerKey)]);
  const obj = (k: string) => {
    const x = v[k];
    if (x === undefined) return {};
    if (!x || typeof x !== "object" || Array.isArray(x)) refuseSurfaceWrite(`${k} must be an object keyed by question.`);
    return x as Record<string, unknown>;
  };
  const lists = { ...current.lists };
  for (const [k, items] of Object.entries(obj("lists"))) {
    const q = listQ.get(k);
    if (!q) refuseSurfaceWrite(`lists.${k} is not a list question in review_questions.`);
    if (!Array.isArray(items) || !items.every((x) => typeof x === "string")) refuseSurfaceWrite(`lists.${k} must be a list of texts.`);
    const clean = (items as string[]).map((x) => x.trim()).filter(Boolean);
    if (clean.length > (q!.maxItems ?? 5)) refuseSurfaceWrite(`lists.${k} takes at most ${q!.maxItems ?? 5} items.`);
    lists[k] = clean;
  }
  const ratings = { ...current.ratings };
  for (const [k, r] of Object.entries(obj("ratings"))) {
    if (!ratingKeys.has(k)) refuseSurfaceWrite(`ratings.${k} is not a rating in review_questions ("<question>.<item>").`);
    if (!isRatingValue(r)) refuseSurfaceWrite(`ratings.${k} must be a rating_points value (1-5).`);
    ratings[k] = r as number;
  }
  const texts = { ...current.texts };
  for (const [k, t] of Object.entries(obj("texts"))) {
    if (!textKeys.has(k)) refuseSurfaceWrite(`texts.${k} is not a text question in review_questions.`);
    if (typeof t !== "string") refuseSurfaceWrite(`texts.${k} must be text.`);
    texts[k] = t as string;
  }
  return { ...current, lists, ratings, texts };
}
