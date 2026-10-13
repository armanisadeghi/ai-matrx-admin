"use client";

/**
 * The ONE Watch AI door for an inline run (a run rendered without window chrome,
 * e.g. an Applet job's output). Present only for people who may watch
 * (`useCanWatchAi`: system admins with debug mode on); absent for everyone else.
 */

import { Eye } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useWatchAiRun } from "@/features/overlays/openers/aiWatchWindow";
import { useCanWatchAi } from "@/features/ai-watch/useCanWatchAi";

export function WatchAiRunButton({
  requestId = null,
  userRequestId = null,
  label = null,
}: {
  requestId?: string | null;
  userRequestId?: string | null;
  label?: string | null;
}) {
  const canWatch = useCanWatchAi();
  const watch = useWatchAiRun();
  if (!canWatch || (!requestId && !userRequestId)) return null;
  return (
    <Button
      variant="quiet"
      icon={<Eye />}
      title="Watch AI: the exact request and response"
      onClick={() => watch({ requestId, userRequestId, label })}
    >
      Watch AI
    </Button>
  );
}
