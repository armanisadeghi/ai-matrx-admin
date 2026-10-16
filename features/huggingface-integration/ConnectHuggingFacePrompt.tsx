"use client";

/**
 * ConnectHuggingFacePrompt — what a discovery surface shows when aidream answers
 * `needs_huggingface_connection` (a gated or private repository and no token).
 * One line of why, then the same connect card; `onConnected` lets the caller
 * retry the read it was refused.
 */

import { HuggingFaceConnectionCard } from "./HuggingFaceConnectionCard";

export const NEEDS_HUGGINGFACE_CONNECTION = "needs_huggingface_connection";

export function ConnectHuggingFacePrompt({
  reason = "This model needs your Hugging Face account.",
  onConnected,
}: {
  reason?: string;
  onConnected?: () => void;
}) {
  return (
    <div className="space-y-2" data-testid="connect-huggingface-prompt">
      <p className="text-sm">{reason}</p>
      <HuggingFaceConnectionCard compact onConnected={onConnected} />
    </div>
  );
}
