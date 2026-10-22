/**
 * Surface manifest — Commerce intake answers (`matrx-user/commerce-intake-answer`).
 *
 * `/commerce/intake/answer`: the quick-answer queue — one open question about a captured
 * intake asset at a time, photo first, answered by a chip, yes/no or typed or dictated
 * text; Skip sends it to the back, "Not a quick answer" routes it out.
 *
 * Emitter: `IntakeAnswerQueue` (`features/commerce-intake/components/`)`.
 * Write targets:
 *   - `answer_draft` (DRAFT) fills the answer box; nothing is saved.
 *   - `answer_question` answers the question in view through `answerQuestion`, the
 *     door the page's chips and Answer button use, and moves to the next one.
 * Not writable: Skip and "Not a quick answer" (the person's call on the queue).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const COMMERCE_INTAKE_ANSWER_SURFACE_NAME = "matrx-user/commerce-intake-answer";

const groups: SurfaceValueGroup[] = [
  { key: "answer_queue", label: "Answer queue", sortOrder: 100, description: "Where the queue stands." },
  { key: "answer_question", label: "Question in view", sortOrder: 200, description: "The one question being answered." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" ? 3 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("queue_load_status", "Load status", "string", "answer_queue", 100, '"loading", "loaded" or "failed" (the read failed; the page offers a retry).', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("open_question_count", "Questions waiting", "number", "answer_queue", 110, "Open questions left in the queue, the one in view included (0 = all answered)."),
  v("answered_count", "Answered", "number", "answer_queue", 120, "Questions answered on this visit."),
  v("question_prompt", "Question", "string", "answer_question", 200, "The question in view, in its own words.", {
    typicalCharCount: 120,
    inlineUpTo: 1000,
  }),
  v(
    "question",
    "Question details",
    "object",
    "answer_question",
    210,
    '{ id, prompt, kind ("text" | "choice" | "boolean"), options ([{ value, label }] for choice), value_impact ("high" | "medium" | "low" or null), skip_count, priority, created_at }.',
    { typicalCharCount: 400 },
  ),
  v(
    "question_subject",
    "Asset",
    "object",
    "answer_question",
    220,
    "The intake asset the question is about: { asset_id, organization_id, qr_code, notes, pipeline_state, attributes }.",
    { typicalCharCount: 300 },
  ),
  v("answer_draft", "Answer box", "string", "answer_question", 230, "What is typed in the answer box now (not saved until answered).", {
    typicalCharCount: 80,
  }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "answer_draft",
    label: "Fill the answer box",
    description:
      "Put text in the answer box for the person to check. NOTHING is saved until they press Answer. Value is the answer text. Refused: no question in view.",
    valueType: "string",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "answer_draft",
    group: "answer_question",
    sortOrder: 300,
  },
  {
    name: "answer_question",
    label: "Answer the question",
    description:
      'Answer the question in view, as the page buttons do; the next question comes up. SAVED after the person approves. Value is the answer text: for a "choice" question one option value from question.options, for a "boolean" question "yes" or "no", otherwise free text. Refused: empty text, an option that is not offered, no question in view.',
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    group: "answer_question",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: COMMERCE_INTAKE_ANSWER_SURFACE_NAME,
  situation:
    "They are answering quick questions about captured intake assets (page: {queue_load_status}): {open_question_count|no} questions waiting, {answered_count|none} answered this visit. The one in view asks: \"{question_prompt|nothing}\". You can fill the answer box or answer it.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce intake answers",
  description: "The intake quick-answer queue: one open question about a captured asset at a time.",
  urlPattern: "/commerce/intake/answer",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commerceIntakeAnswerManifest = declared;

export function createCommerceIntakeAnswerScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
