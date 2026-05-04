/**
 * Quiz module — Column 4 alt for course/training sessions. Generates a
 * multiple-choice quiz from the cleaned transcript.
 *
 * Agent contract:
 *   - Input scope: { cleaned_window, prior_quizzes, session_title }
 *   - Output: a fenced JSON block whose root is `quiz_title` with a
 *     `multiple_choice: [...]` array. Recognized by the platform's
 *     content-splitter and rendered via `MultipleChoiceQuiz`.
 */

import { HelpCircle } from "lucide-react";
import {
  DEFAULT_QUIZ_SHORTCUT_ID,
  MODULE_INTERVAL_DEFAULT_MS,
} from "../../constants";
import { registerModule } from "../registry";
import { buildModuleScopeFromInputs } from "../_lib/buildModuleScope";
import type {
  ModuleDefinition,
  ParsedModuleSegment,
} from "../types";

const QUIZ_DEFAULT_INTERVAL_MS = 300_000; // 5 min — slow cadence

const QuizModule: ModuleDefinition = {
  id: "quiz",
  label: "Quiz",
  description:
    "Generates multiple-choice review questions from the transcript.",
  icon: HelpCircle,
  defaultShortcutId: DEFAULT_QUIZ_SHORTCUT_ID,
  defaultIntervalMs: QUIZ_DEFAULT_INTERVAL_MS || MODULE_INTERVAL_DEFAULT_MS,
  blockType: "quiz",
  buildScope(inputs) {
    return buildModuleScopeFromInputs(inputs, {
      toScope: ({ cleanedWindow, priorSummary, sessionTitle }) => ({
        cleaned_window: cleanedWindow,
        prior_quizzes: priorSummary,
        session_title: sessionTitle,
      }),
    });
  },
  parseRun(responseText): ParsedModuleSegment[] | null {
    const trimmed = responseText.trim();
    if (!trimmed) return [];

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = (fenced ? fenced[1] : trimmed).trim();
    if (!body) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return null;
    }
    const quiz = parsed as
      | { quiz_title?: string; multiple_choice?: unknown[] }
      | null;
    if (
      !quiz?.quiz_title ||
      !Array.isArray(quiz.multiple_choice) ||
      quiz.multiple_choice.length === 0
    ) {
      return [];
    }

    const payload = "```json\n" + body + "\n```";
    return [
      {
        payload,
        tStart: null,
        tEnd: null,
      },
    ];
  },
};

registerModule(QuizModule);

export default QuizModule;
