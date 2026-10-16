"use client";

/**
 * The hosted run's Stop control.
 *
 * A hosted Claude Code or Codex run happens in a Matrx Sandbox we started, so the user
 * must be able to stop it — and the control must say what stopping ends, not
 * ask a generic "Are you sure?" (`common-docs/policies/no-dead-ends.md`).
 * A plain cancel gets no confirm dialog; it gets an honest sentence.
 *
 * Law 4 — absent or honest, never dead. Cancel needs the sandbox's run id,
 * which the run's own stream reports. Until that id arrives there is NO
 * button: there is a sentence saying stopping becomes possible the moment the
 * sandbox reports the run. A disabled-looking button that cannot act is the
 * failure mode this avoids.
 */

import { useState } from "react";
import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  cancelHostedRun,
  type HostedProvider,
} from "@/features/ai-work/lib/hostedSandboxRun";

export function HostedRunControls({
  provider = "claude_code",
  running,
  runtimeId,
  onCancelled,
}: {
  /** Which coding agent the run is: decides the cancel url and the words. */
  provider?: HostedProvider;
  /** A hosted run is in flight. */
  running: boolean;
  /** The sandbox run id the stream reported, or null if it has not yet. */
  runtimeId: string | null;
  onCancelled?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  if (!running) return null;
  const agentName = provider === "codex" ? "Codex" : "Claude Code";

  if (!runtimeId) {
    return (
      <p className="text-xs text-muted-foreground">
        The sandbox has not reported this run&apos;s id yet. Stopping becomes
        available the moment it does.
      </p>
    );
  }

  const stop = async () => {
    setCancelling(true);
    try {
      const result = await cancelHostedRun(runtimeId, provider);
      if (result.cancelled) {
        toast.success(
          `The hosted ${agentName} session was stopped. Anything it already wrote in the sandbox stays as it is.`,
        );
        onCancelled?.();
      } else {
        toast.error(
          "AI Matrx could not confirm the hosted session stopped. It may still be running — check the conversation.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `The hosted session could not be stopped — ${error.message}`
          : "The hosted session could not be stopped.",
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        icon={cancelling ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Square />
        )}
        type="button"
        variant="outline"
        onClick={stop}
        disabled={cancelling}
      >
        Stop the hosted session
      </Button>
      <span className="text-xs text-muted-foreground">
        Stops the {agentName} run in the Matrx Sandbox now. Work it already
        finished stays in the conversation; anything in progress is lost.
      </span>
    </div>
  );
}
