/**
 * Decisions module — Column 4 alt for meeting/strategy sessions. Captures
 * decisions made and their reasoning as a `decision_tree` JSON block.
 *
 * Agent contract:
 *   - Input scope: { cleaned_window, prior_decisions, session_title }
 *   - Output: a fenced JSON block whose root key is `decision_tree` with
 *     `{ title, root: { ... } }`. The platform's content-splitter recognizes
 *     this shape and renders via `DecisionTreeBlock`.
 */

import { GitFork } from "lucide-react";
import {
  DEFAULT_DECISIONS_SHORTCUT_ID,
  MODULE_INTERVAL_DEFAULT_MS,
} from "../../constants";
import { registerModule } from "../registry";
import { buildModuleScopeFromInputs } from "../_lib/buildModuleScope";
import type {
  ModuleDefinition,
  ParsedModuleSegment,
} from "../types";

const DECISIONS_DEFAULT_INTERVAL_MS = 240_000; // 4 min

const DecisionsModule: ModuleDefinition = {
  id: "decisions",
  label: "Decisions",
  description:
    "Captures decisions and their rationale as a navigable decision tree.",
  icon: GitFork,
  defaultShortcutId: DEFAULT_DECISIONS_SHORTCUT_ID,
  defaultIntervalMs:
    DECISIONS_DEFAULT_INTERVAL_MS || MODULE_INTERVAL_DEFAULT_MS,
  blockType: "decision_tree",
  buildScope(inputs) {
    return buildModuleScopeFromInputs(inputs, {
      toScope: ({ cleanedWindow, priorSummary, sessionTitle }) => ({
        cleaned_window: cleanedWindow,
        prior_decisions: priorSummary,
        session_title: sessionTitle,
      }),
    });
  },
  parseRun(responseText): ParsedModuleSegment[] | null {
    const trimmed = responseText.trim();
    if (!trimmed) return [];

    // Pull out a JSON code fence; tolerate missing language tag.
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = (fenced ? fenced[1] : trimmed).trim();
    if (!body) return [];

    // Validate root shape is a `decision_tree` object before persisting.
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return null; // malformed JSON → mark run failed
    }
    const tree = (parsed as { decision_tree?: { title?: string; root?: unknown } } | null)
      ?.decision_tree;
    if (!tree?.title || !tree.root) return [];

    // Persist as a fenced JSON block so MarkdownStream recognizes it.
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

registerModule(DecisionsModule);

export default DecisionsModule;
