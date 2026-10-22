/**
 * Surface manifest — Quizzes (`matrx-user/education-quizzes`), the
 * /education/quizzes list. Built by `_assessment-list.manifest.ts`, shared with
 * the Practice Tests list; one quiz's own views keep
 * `matrx-user/education-assessment`.
 */

import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { buildAssessmentListManifest, createAssessmentListScope } from "./_assessment-list.manifest";

export const educationQuizzesManifest: SurfaceManifest = buildAssessmentListManifest({
  surfaceName: "matrx-user/education-quizzes",
  situation:
    "They are on their list of quizzes, the {visibility_filter} lane (search: {search_query|none}), showing {assessment_count|an unknown number of} quizzes. They can open or take a quiz, generate a new one with AI (uses their plan), create empty ones, and change or archive their own.",
  label: "Quizzes",
  noun: "quiz",
  plural: "quizzes",
  targetPlural: "quizzes",
  defaultCount: 8,
  countMax: 30,
  timed: false,
  urlPattern: "/education/quizzes",
});

/** This page's scope builder — the shared list payload, named per surface so
 * `pnpm surface:census` sees which page emits it (assessmentListSurface.ts). */
export const createEducationQuizzesScope = createAssessmentListScope;
