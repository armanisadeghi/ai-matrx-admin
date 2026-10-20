/**
 * Agent Studio — the ways in (DESIGN.md §11). A registry, never a hard-coded flow: the start
 * screen renders one selector item per row, and a row with `comingSoonId` is a tracked promise
 * (`lib/coming-soon/registry.ts`), never a working door.
 */

import type { LucideIcon } from "lucide-react";
import { Lightbulb, Handshake, Wrench, Files, ArrowDownToLine, TerminalSquare } from "lucide-react";

export type StudioModeId =
  | "describe"
  | "do-with-me"
  | "improve"
  | "from-examples"
  | "from-claude-account"
  | "with-claude-code";

export interface StudioMode {
  id: StudioModeId;
  title: string;
  /**
   * The selector's label (≤18 chars), a plain verb a first-timer reads without help: "Describe it",
   * "Do it together", "Improve an agent", "From my examples", "Import from Claude", "Use Claude Code".
   * "Examples" is the one word for what a person already made (the composer's "Add an example", the
   * examples panel's "Example 1"), never "samples" or "proof".
   */
  label: string;
  /** One line under the title (≤60 chars). */
  line: string;
  /** The start screen's headline while this way in is open (in-place ways in only). */
  headline?: string;
  icon: LucideIcon;
  /**
   * Set = this way in is its own page (the card links there instead of starting in place). Bring-over
   * modes: their landing flow lives in `features/agents/studio/bring-over/`.
   */
  href?: string;
  /** Set = not built yet; the card announces this tracked promise instead of starting. */
  comingSoonId?: string;
  /**
   * Set = this way in sits in the row's one "Import" menu (with its line under it) instead of
   * taking its own chip: the row stays one line at full width and the developer-leaning ways in
   * stay one press away without competing with the four first-timer ones.
   */
  inImportMenu?: boolean;
}

export const STUDIO_MODES: readonly StudioMode[] = [
  {
    id: "describe",
    title: "Describe it",
    label: "Describe it",
    line: "Say what the agent should do; we build it",
    headline: "What should your agent do?",
    icon: Lightbulb,
  },
  {
    id: "do-with-me",
    title: "Do it together",
    label: "Do it together",
    line: "Get the result first, then make it an agent",
    icon: Handshake,
  },
  {
    id: "improve",
    title: "Improve an agent",
    label: "Improve an agent",
    headline: "Which agent should get better?",
    line: "Try, give feedback, save a better version",
    icon: Wrench,
  },
  {
    id: "from-examples",
    title: "From my examples",
    label: "From my examples",
    headline: "Show it what you already made",
    line: "Paste 2–5 you made; get an agent that makes them",
    icon: Files,
  },
  {
    id: "from-claude-account",
    title: "Import from Claude",
    label: "Import from Claude",
    line: "Upload your Claude export; pick the chat to copy",
    icon: ArrowDownToLine,
    href: "/agents/new/studio/from-claude",
    inImportMenu: true,
  },
  {
    id: "with-claude-code",
    title: "Use Claude Code",
    label: "Use Claude Code",
    line: "Copy a prompt; Claude Code sends us the job",
    icon: TerminalSquare,
    href: "/agents/new/studio/with-claude-code",
    inImportMenu: true,
  },
];

/** The ways in whose first step is on the start screen (a box, a picker), not in the workspace. */
export type StudioStartModeId = "describe" | "improve" | "from-examples";
const START_STEP_MODES: ReadonlySet<string> = new Set<StudioStartModeId>(["describe", "improve", "from-examples"]);

/**
 * `?mode=<id>` with nothing started yet (no build, agent, conversation or run): the start step of
 * that way in, so the link opens the mode it names — `?mode=describe` is the Describe box, never the
 * workspace's assistant. Null once the mode has started something (the workspace takes over).
 */
export function studioStartStep(state: {
  mode: string | null;
  buildId: string | null;
  agentId: string | null;
  chatId: string | null;
  runId: string | null;
}): StudioStartModeId | null {
  if (!state.mode || !START_STEP_MODES.has(state.mode)) return null;
  if (state.buildId || state.agentId || state.chatId || state.runId) return null;
  return state.mode as StudioStartModeId;
}

/** A way in that is its own page (Import from Claude, Use Claude Code): where `?mode=<id>` goes. */
export function studioPageHref(id: string | null | undefined): string | null {
  return STUDIO_MODES.find((m) => m.id === id)?.href ?? null;
}

export function studioMode(id: string | null | undefined): StudioMode | null {
  const mode = STUDIO_MODES.find((m) => m.id === id);
  return mode && !mode.comingSoonId && !mode.href ? mode : null;
}

/**
 * Starter jobs a first-timer can press to fill the box (the empty state when a person has no agents
 * yet). Plain, cross-industry, each a real one-agent job; pressing one fills "Describe it" — it never
 * starts a build by itself.
 */
export const STUDIO_STARTERS: readonly string[] = [
  "Turn a messy client intake call into a one-page brief",
  "Reply to a customer complaint in our voice, ready to send",
  "Summarize a long contract into the five things that matter",
  "Write a weekly update for my team from my rough notes",
];
