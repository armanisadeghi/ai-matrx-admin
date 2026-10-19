"use client";

/**
 * The chat dock's card for a workflow run the server holds for the conversation but no message on
 * screen draws (an older message, or a run the agent started itself): the same live
 * `BackgroundRunCard`, in full. Registered as the chat package's `BackgroundRunCard` host slot.
 */

import { BackgroundRunCard } from "./BackgroundRunCard";

export function DockRunCard({ runId, title }: { runId: string; title: string }) {
  return <BackgroundRunCard runId={runId} hint={null} name={title} placement="dock" />;
}
