"use client";

/**
 * The chat dock's card for a workflow run the server holds for the conversation but no message on
 * screen draws (an older message, or a run the agent started itself): the same live
 * `BackgroundRunCard`, in full. Registered as the chat package's `BackgroundRunCard` host slot.
 *
 * The title is the run's chat-stamp label (`run_end_wake.chat_wake_stamp`): "Notion import of X" /
 * "Copy X" for records runs, "Workflow X" for workflow runs. It names the kind up front, so the
 * card draws the right stage strip from its first paint (no import strip flashing on a workflow).
 */

import { BackgroundRunCard } from "./BackgroundRunCard";
import type { BackgroundRunKind } from "./backgroundRun";

/**
 * The card's kind from the run's recorded stamp tool (`chat_wake.tool`): records runs are an import
 * or a copy (the run's own input tells which), everything else draws as a workflow. A run with no
 * recorded tool falls back to the label's wording.
 */
export function dockRunKind(title: string, runKind?: string | null): { hint: BackgroundRunKind | null; name: string | null } {
  if (runKind === "records") return { hint: null, name: null };
  if (!runKind) {
    if (/^notion import\b/i.test(title)) return { hint: "import", name: null };
    if (/^(the )?copy\b/i.test(title)) return { hint: "copy", name: null };
  }
  const name = title.replace(/^workflow\s*/i, "").trim();
  return { hint: "workflow", name: name && name !== "run" ? name : null };
}

export function DockRunCard({ runId, title, runKind }: { runId: string; title: string; runKind?: string | null }) {
  const { hint, name } = dockRunKind(title, runKind);
  return <BackgroundRunCard runId={runId} hint={hint} name={name} placement="dock" />;
}
