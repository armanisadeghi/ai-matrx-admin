/**
 * Surface manifest — Practice Tests (`matrx-user/education-practice-tests`),
 * the /education/practice-tests list. Built by `_assessment-list.manifest.ts`,
 * shared with the Quizzes list; one practice test's own views keep
 * `matrx-user/education-assessment`.
 */

import type { SurfaceManifest } from "@ai-matrx/chat/surfaces/types";
import { buildAssessmentListManifest, createAssessmentListScope } from "./_assessment-list.manifest";

export const educationPracticeTestsManifest: SurfaceManifest = buildAssessmentListManifest({
  surfaceName: "matrx-user/education-practice-tests",
  situation:
    "They are on their list of practice tests, the {visibility_filter} lane (search: {search_query|none}), showing {assessment_count|an unknown number of} practice tests. They can open or take one, generate a new one with AI (uses their plan), create empty ones, and change or archive their own.",
  label: "Practice Tests",
  noun: "practice test",
  plural: "practice tests",
  targetPlural: "practice_tests",
  defaultCount: 20,
  countMax: 60,
  timed: true,
  urlPattern: "/education/practice-tests",
});

/** This page's scope builder — the shared list payload, named per surface so
 * `pnpm surface:census` sees which page emits it (assessmentListSurface.ts). */
export const createEducationPracticeTestsScope = createAssessmentListScope;
