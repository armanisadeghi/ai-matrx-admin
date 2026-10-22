/**
 * Surface manifest — Decision review (`matrx-user/decision-review`), route `/decisions/review`.
 *
 * The combined queue of answers agents, workflow Decide steps and API models gave to yes/no, choice
 * and score questions, lowest confidence first, for a person to give the TRUE answer. Emitter:
 * `ReviewQueue` (`features/agents/decision-review/components/`) when it is the combined queue (no
 * `agentId`); one agent's queue on its own page is not this surface.
 *
 * READ-ONLY on purpose: the true answer is the human ground truth the agents are measured against.
 * An agent answering it would grade itself. It may explain an item or the instructions.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const DECISION_REVIEW_SURFACE_NAME = "matrx-user/decision-review";

const ITEM =
  "{ id, source (agent | workflow step | API model), question, answer_type (noul = yes/no, choice, score), agent_answer, confidence (0-1), options, true_answer (the person's label, null until given), agreed, model, created_at }";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "review_load_status",
    label: "Load status",
    description: '"loading", "loaded" or "failed" (the page says so; it is never "no answers").',
    valueType: "string",
    alwaysAvailable: true,
    autoContext: true,
    typicalCharCount: 7,
    sortOrder: 100,
  },
  {
    name: "review_filters",
    label: "Filters",
    description: '{ status ("unlabeled" | "labeled" | "all"), source, question, method, model, version } as set on the page.',
    valueType: "object",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 120,
    sortOrder: 110,
  },
  {
    name: "review_listed_count",
    label: "Listed",
    description: "How many answers the queue lists with these filters.",
    valueType: "number",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 3,
    sortOrder: 120,
  },
  {
    name: "review_items",
    label: "Answers listed",
    description: `The first 25 listed, lowest confidence first: ${ITEM}.`,
    valueType: "array",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 4000,
    inlineUpTo: 4000,
    sortOrder: 130,
  },
  {
    name: "review_selected",
    label: "Answer under review",
    description: `The selected answer: ${ITEM} plus instructions (what the question asked the answerer to do).`,
    valueType: "object",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 800,
    inlineUpTo: 2000,
    sortOrder: 140,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: DECISION_REVIEW_SURFACE_NAME,
  situation:
    "They are giving the true answer to AI answers ({review_listed_count|none} listed). You can explain an answer or its question; only they give the true answer.",
  inheritsFrom: "matrx-default/intelligence",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Decision review",
  description: "The queue of AI answers waiting for a person's true answer.",
  urlPattern: "/decisions/review",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

export const decisionReviewManifest = declared;

export function createDecisionReviewScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
