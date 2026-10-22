// features/education/assessment/data/createStyleDraft.ts
//
// The New quiz / practice test form's "style and details" answers, kept across
// a reload the way the Source input keeps its picks (wizardDraft). Restoring
// refuses — and names — anything it does not recognize, never guesses.

import { isDepth, isDifficulty, isQuestionType } from "./types";
import type { Depth, Difficulty, QuestionType } from "./types";

export interface AssessmentStyleDraft {
  count?: number;
  difficulty?: Difficulty;
  depth?: Depth;
  questionTypes?: QuestionType[];
  examType?: string;
  timeLimitMinutes?: number;
  userRequest?: string;
}

export function restoreAssessmentStyle(data: Record<string, unknown>): {
  values: AssessmentStyleDraft;
  rejectedKeys: string[];
} {
  const values: AssessmentStyleDraft = {};
  const rejectedKeys: string[] = [];
  for (const [key, v] of Object.entries(data)) {
    if (key === "count" && Number.isInteger(v) && (v as number) >= 1) values.count = v as number;
    else if (key === "difficulty" && typeof v === "string" && isDifficulty(v)) values.difficulty = v;
    else if (key === "depth" && typeof v === "string" && isDepth(v)) values.depth = v;
    else if (
      key === "questionTypes" &&
      Array.isArray(v) &&
      v.every((t) => typeof t === "string" && isQuestionType(t))
    )
      values.questionTypes = v as QuestionType[];
    else if (key === "timeLimitMinutes" && Number.isInteger(v) && (v as number) >= 0)
      values.timeLimitMinutes = v as number;
    else if ((key === "examType" || key === "userRequest") && typeof v === "string") values[key] = v;
    else rejectedKeys.push(key);
  }
  return { values, rejectedKeys };
}
