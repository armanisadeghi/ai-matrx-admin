/**
 * Agent Studio — the ways in (DESIGN.md §11). A registry, never a hard-coded flow: the start
 * screen renders one card per row, and a row with `comingSoonId` is a tracked promise
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
  /** One line under the title (≤60 chars). */
  line: string;
  icon: LucideIcon;
  /**
   * Set = this way in is its own page (the card links there instead of starting in place). Bring-over
   * modes: their landing flow lives in `features/agents/studio/bring-over/`.
   */
  href?: string;
  /** Set = not built yet; the card announces this tracked promise instead of starting. */
  comingSoonId?: string;
}

export const STUDIO_MODES: readonly StudioMode[] = [
  { id: "describe", title: "Describe it", line: "Say what the agent should do; we build it", icon: Lightbulb },
  { id: "do-with-me", title: "Just do it with me", line: "Get the result first, then make it an agent", icon: Handshake },
  {
    id: "improve",
    title: "Improve an agent I have",
    line: "Try, give feedback, save a better version",
    icon: Wrench,
    comingSoonId: "agents.studio-improve-existing",
  },
  {
    id: "from-examples",
    title: "From examples I already have",
    line: "Finished examples in, a proven agent out",
    icon: Files,
    comingSoonId: "agents.studio-from-examples",
  },
  {
    id: "from-claude-account",
    title: "Bring it over from my Claude account",
    line: "Upload your Claude export; pick the chat to copy",
    icon: ArrowDownToLine,
    href: "/agents/new/studio/from-claude",
  },
  {
    id: "with-claude-code",
    title: "Build it with Claude Code",
    line: "Copy a prompt; Claude Code sends us the job",
    icon: TerminalSquare,
    href: "/agents/new/studio/with-claude-code",
  },
];

export function studioMode(id: string | null | undefined): StudioMode | null {
  const mode = STUDIO_MODES.find((m) => m.id === id);
  return mode && !mode.comingSoonId ? mode : null;
}
