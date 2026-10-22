/**
 * Surface manifest — one Question Desk interview (`matrx-admin/question-desk-interview`).
 *
 * `/administration/question-desk/[interviewId]`: the decisions agents put to a person, one
 * question per screen (or a table), each with its research (what was ruled before, what the best
 * do, what the system does today, what each way costs) and a recommendation, plus the answers
 * given so far. Parent: Platform (question-desk sits under platform in the domain tree).
 *
 * Emitter: `InterviewClient` (`features/question-desk/components/`), on the admin desk seat only
 * (the marketing owner sitting reuses the component with its own seat). Write target
 * `answer_draft` writes into the answer box for the open question; the ANSWER is the person's:
 * they read it and press Save. Taking a recommendation, skipping or handing back stay their keys.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_QUESTION_DESK_INTERVIEW_SURFACE_NAME = "matrx-admin/question-desk-interview";

const interviewGroup: SurfaceValueGroup = { key: "qd_interview", label: "Interview", sortOrder: 100, description: "The interview and its progress." };
const questionGroup: SurfaceValueGroup = { key: "qd_question", label: "Open question", sortOrder: 200, description: "The question on screen and the answer being written." };

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], group: string, sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const values: SurfaceValue[] = [
  v("interview_id", "Interview ID", "string", interviewGroup.key, 100, "UUID of the interview (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("interview_load_status", "Load status", "string", interviewGroup.key, 110, '"loading", "failed" (the page shows why) or "loaded".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("interview_title", "Interview", "string", interviewGroup.key, 120, "The interview's title."),
  v("interview_purpose", "Purpose", "string", interviewGroup.key, 130, "Why it was opened (its subtitle and purpose).", { typicalCharCount: 200 }),
  v("respondent_email", "Addressed to", "string", interviewGroup.key, 140, "Who the interview is addressed to."),
  v("view", "View", "string", interviewGroup.key, 150, '"one" (one question per screen) or "table".'),
  v("question_count", "Questions", "number", interviewGroup.key, 160, "How many ask-mode questions it has."),
  v("answered_count", "Answered", "number", interviewGroup.key, 170, "How many of them are answered."),
  v("review_count", "To review", "number", interviewGroup.key, 180, "How many review-mode rows it has (decisions to confirm or overturn)."),
  v(
    "questions",
    "Question list",
    "array",
    interviewGroup.key,
    190,
    "Every question in order: { id, slug, title, mode (ask | review), status, answered, verdict, answer_text }.",
    { typicalCharCount: 3000 },
  ),
  v(
    "current_question",
    "Open question",
    "object",
    questionGroup.key,
    200,
    "The question on screen: { id, slug, title, question, background, recommendation, ruled_before, the_best_do, today, implications, blocks, default_in_force, answered, verdict, answer_text }.",
    { typicalCharCount: 3000 },
  ),
  v("answer_box_open", "Answer box open", "boolean", questionGroup.key, 210, "True while the person's answer box is open."),
  v("answer_draft", "Answer draft", "string", questionGroup.key, 220, "The words in the answer box for the open question (not saved as an answer until they press Save).", {
    typicalCharCount: 300,
    inlineUpTo: 4000,
  }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "answer_draft",
    label: "Write in the answer box",
    description:
      "Write a draft answer into the open question's answer box, in the person's voice, and open the box. NOTHING is answered: the person reads it, edits it and presses Save. Value is the full text (it replaces what is in the box). Refused when no question is open.",
    valueType: "string",
    mode: "draft",
    applyPolicy: "ask",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "answer_draft",
    group: questionGroup.key,
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  surfaceName: ADMIN_QUESTION_DESK_INTERVIEW_SURFACE_NAME,
  situation:
    "They are answering the Question Desk interview {interview_title|loading} ({answered_count|0} of {question_count|its} questions answered). You can draft an answer into the box for the open question; the answer is theirs to save.",
  inheritsFrom: "matrx-default/platform",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Question Desk interview",
  description: "One Question Desk interview: the decisions put to a person, their research, and the answers so far.",
  urlPattern: "/administration/question-desk/[interviewId]",
  groups: [interviewGroup, questionGroup],
  values,
  writeTargets,
  skipBaselineValues: true,
};

export const adminQuestionDeskInterviewManifest = declared;
