"use client";

/**
 * AiTestReplayBadge — "Baseline replay" / "Stand-in" on a step result the
 * server answered from a saved one (features/ai-test-mode/replay.ts). Hover:
 * the baseline's label and when it was saved. Renders nothing for a real result.
 */

import { History } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { aiTestReplayLabel, readAiTestReplay, type AiTestReplay } from "./replay";

function hoverText(replay: AiTestReplay): string {
  const parts = [replay.label ?? "Unnamed baseline"];
  if (replay.savedAt) parts.push(`saved ${formatAbsoluteDate(replay.savedAt, { dateStyle: "medium", timeStyle: "short" })}`);
  return parts.join(" · ");
}

export function AiTestReplayBadge({
  output,
  replay,
  className,
}: {
  /** A step output (AiExecutionResult or a node output wrapping one). */
  output?: unknown;
  /** Or an already-read stamp. */
  replay?: AiTestReplay | null;
  className?: string;
}) {
  const stamp = replay ?? readAiTestReplay(output);
  if (!stamp) return null;
  return (
    <Badge
      tone="warning"
      icon={<History aria-hidden />}
      title={hoverText(stamp)}
      data-ai-test-replay={stamp.match}
      className={className}
    >
      {aiTestReplayLabel(stamp)}
    </Badge>
  );
}
