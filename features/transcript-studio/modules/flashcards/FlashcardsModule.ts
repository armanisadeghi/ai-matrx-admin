/**
 * Flashcards module — Column 4 alt for study/lecture sessions. Extracts
 * front/back study cards from the cleaned transcript and renders via the
 * existing `<flashcards>` block.
 *
 * Agent contract:
 *   - Input scope: { cleaned_window, prior_flashcards, session_title }
 *   - Output: an XML `<flashcards>...</flashcards>` block (the canonical
 *     platform flashcards syntax recognized by `MarkdownStream`).
 *
 * One module segment per pass — payload accumulates the agent's flashcards
 * for the time range. Mid-session module switches preserve flashcards rows
 * tagged with module_id="flashcards".
 */

import { Layers } from "lucide-react";
import {
  DEFAULT_FLASHCARDS_SHORTCUT_ID,
  MODULE_INTERVAL_DEFAULT_MS,
} from "../../constants";
import { registerModule } from "../registry";
import { buildModuleScopeFromInputs } from "../_lib/buildModuleScope";
import type {
  ModuleDefinition,
  ParsedModuleSegment,
} from "../types";

const FLASHCARDS_DEFAULT_INTERVAL_MS = 180_000; // 3 min — slower than tasks

const FlashcardsModule: ModuleDefinition = {
  id: "flashcards",
  label: "Flashcards",
  description:
    "Generates front/back study cards from the cleaned transcript.",
  icon: Layers,
  defaultShortcutId: DEFAULT_FLASHCARDS_SHORTCUT_ID,
  defaultIntervalMs:
    FLASHCARDS_DEFAULT_INTERVAL_MS || MODULE_INTERVAL_DEFAULT_MS,
  blockType: "flashcards",
  buildScope(inputs) {
    return buildModuleScopeFromInputs(inputs, {
      toScope: ({ cleanedWindow, priorSummary, sessionTitle }) => ({
        cleaned_window: cleanedWindow,
        prior_flashcards: priorSummary,
        session_title: sessionTitle,
      }),
    });
  },
  parseRun(responseText): ParsedModuleSegment[] | null {
    const trimmed = responseText.trim();
    if (!trimmed) return [];

    // Accept either the bare XML or a fenced wrapper.
    const fenced = trimmed.match(/```(?:flashcards|xml)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1]!.trim() : trimmed;
    if (!body) return [];

    // Sanity check — must contain at least one <flashcards> tag.
    if (!/<flashcards[\s>]/i.test(body)) return [];

    return [
      {
        payload: body,
        tStart: null,
        tEnd: null,
      },
    ];
  },
};

registerModule(FlashcardsModule);

export default FlashcardsModule;
