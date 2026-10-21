"use client";

import { Mic, Square } from "lucide-react";
import { Button as ControlButton } from "@ai-matrx/design-system/controls";
import { cn } from "@/lib/utils";
import { useStudioSession } from "../../hooks/useStudioSession";
// THE package duration formatter (`@ai-matrx/kit/format`, census H1
// 2026-09-07). THE UNIT LAW: the unit is in the name, because the fleet's
// ~35 twins variously took ms, seconds and minutes behind one signature.
import { formatDurationSeconds } from "@ai-matrx/kit/format";

interface RecordButtonProps {
  sessionId: string;
  className?: string;
}

export function RecordButton({ sessionId, className }: RecordButtonProps) {
  const session = useStudioSession({ sessionId });

  const isRecording = session.isOwnedRecording;
  const blockedByOther = session.isAnyRecording && !isRecording;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ControlButton
        type="button"
        variant={isRecording ? "danger" : "primary"}
        onClick={isRecording ? session.stop : session.start}
        disabled={blockedByOther}
        title={
          blockedByOther
            ? "Another recording is active. Stop it first."
            : isRecording
              ? "Stop recording"
              : "Start recording"
        }
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        icon={
          isRecording ? (
            <Square className="fill-current" />
          ) : (
            <Mic />
          )
        }
      >
        <span className="hidden sm:inline">
          {isRecording ? "Stop" : "Record"}
        </span>
      </ControlButton>
      {isRecording && (
        <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px]">
          <span className="font-mono tabular-nums text-red-600 dark:text-red-400">
            {formatDurationSeconds(session.durationSec)}
          </span>
          <span
            aria-hidden="true"
            className="block h-2 w-12 overflow-hidden rounded-sm bg-muted/40"
          >
            <span
              className="block h-full bg-red-500/80 transition-[width] duration-100"
              style={{ width: `${Math.min(100, session.audioLevel)}%` }}
            />
          </span>
        </div>
      )}
    </div>
  );
}
