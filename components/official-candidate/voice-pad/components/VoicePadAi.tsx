"use client";

/**
 * VoicePadAi — voice pad with an AI post-processing pipeline.
 *
 * Layout:
 *   - Sidebar: agent picker + free-form user context + Process button
 *   - Main area: transcript on top; once processing starts the pane splits
 *     and the lower half shows the streaming response (spinner → stream →
 *     editable + copy).
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  selectVoicePadEntries,
  selectVoicePadDraftText,
  addTranscriptEntry,
  removeTranscriptEntry,
  clearAllEntries,
  setDraftText,
} from "@/lib/redux/slices/voicePadSlice";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";
import ActionFeedbackButton from "@/components/official/ActionFeedbackButton";
import {
  AI_POST_PROCESS_AGENTS,
  DEFAULT_AI_POST_PROCESS_AGENT_ID,
  type AiPostProcessAgent,
} from "../ai-agents";
import { useAiPostProcess } from "../hooks/useAiPostProcess";

const OVERLAY_ID = "voicePadAi" as const;

interface VoicePadAiProps {
  instanceId: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function VoicePadAi({ instanceId }: VoicePadAiProps) {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((s) =>
    selectVoicePadEntries(s, OVERLAY_ID, instanceId),
  );
  const draftText = useAppSelector((s) =>
    selectVoicePadDraftText(s, OVERLAY_ID, instanceId),
  );
  const [liveTranscript, setLiveTranscript] = useState("");
  const [agentId, setAgentId] = useState<string>(
    DEFAULT_AI_POST_PROCESS_AGENT_ID,
  );
  const [userContext, setUserContext] = useState("");
  const [editedResponse, setEditedResponse] = useState<string | null>(null);

  const ai = useAiPostProcess();

  const windowId = `voice-pad-ai-${instanceId}`;
  const micId = `voice-pad-ai-mic-${instanceId}`;

  const selectedAgent = useMemo<AiPostProcessAgent>(
    () =>
      AI_POST_PROCESS_AGENTS.find((a) => a.id === agentId) ??
      AI_POST_PROCESS_AGENTS[0],
    [agentId],
  );

  const allText = useMemo(
    () => entries.map((e) => e.text).join("\n\n"),
    [entries],
  );
  const baseText = draftText !== null ? draftText : allText;
  const transcriptDisplay = liveTranscript
    ? baseText
      ? baseText + "\n\n" + liveTranscript
      : liveTranscript
    : baseText;

  const handleClose = useCallback(() => {
    dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
  }, [dispatch, instanceId]);

  const handleTranscriptionComplete = useCallback(
    (text: string) => {
      setLiveTranscript("");
      if (text.trim()) {
        dispatch(
          addTranscriptEntry({ overlayId: OVERLAY_ID, instanceId, text }),
        );
      }
    },
    [dispatch, instanceId],
  );

  const handleLiveTranscript = useCallback((text: string) => {
    setLiveTranscript(text);
  }, []);

  const handleRemoveEntry = useCallback(
    (entryId: string) => {
      dispatch(
        removeTranscriptEntry({ overlayId: OVERLAY_ID, instanceId, entryId }),
      );
    },
    [dispatch, instanceId],
  );

  const handleClearAll = useCallback(() => {
    dispatch(clearAllEntries({ overlayId: OVERLAY_ID, instanceId }));
  }, [dispatch, instanceId]);

  const handleDraftChange = useCallback(
    (value: string) => {
      dispatch(setDraftText({ overlayId: OVERLAY_ID, instanceId, text: value }));
    },
    [dispatch, instanceId],
  );

  const handleProcess = useCallback(() => {
    const transcript = baseText.trim();
    if (!transcript) {
      toast.info("Nothing to process — record or type a transcript first");
      return;
    }
    setEditedResponse(null);
    ai.process({
      agent: selectedAgent,
      transcript,
      context: userContext,
    });
  }, [ai, baseText, selectedAgent, userContext]);

  const handleResetProcess = useCallback(() => {
    setEditedResponse(null);
    ai.reset();
  }, [ai]);

  const handleCopyResponse = useCallback(async () => {
    const text = editedResponse ?? ai.accumulatedText;
    if (!text.trim()) {
      toast.info("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [editedResponse, ai.accumulatedText]);

  const hasTranscript =
    entries.length > 0 ||
    draftText !== null ||
    (liveTranscript?.trim().length ?? 0) > 0;

  const showResponsePane = ai.phase !== "idle";
  const isComplete = ai.phase === "complete";
  const isError = ai.phase === "error";
  const isBusyEarly =
    ai.phase === "launching" ||
    ai.phase === "pending" ||
    ai.phase === "connecting";

  const responseValue = editedResponse ?? ai.accumulatedText;

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 text-xs">
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Agent
        </div>
        <div className="flex flex-col gap-1">
          {AI_POST_PROCESS_AGENTS.map((agent) => (
            <label
              key={agent.id}
              className={cn(
                "flex items-start gap-2 rounded-md border border-border/50 p-2 cursor-pointer transition-colors",
                agent.id === agentId
                  ? "bg-primary/10 border-primary/50"
                  : "hover:bg-accent/40",
              )}
            >
              <input
                type="radio"
                name={`voice-pad-ai-agent-${instanceId}`}
                value={agent.id}
                checked={agent.id === agentId}
                onChange={() => setAgentId(agent.id)}
                className="mt-0.5"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium leading-tight">
                  {agent.name}
                </span>
                <span className="text-[10px] text-muted-foreground/80 leading-tight">
                  var: <code>{agent.transcriptVariableKey}</code>
                  {agent.contextSlotKey && (
                    <>
                      {" "}· ctx: <code>{agent.contextSlotKey}</code>
                    </>
                  )}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Context
          </span>
          {!selectedAgent.contextSlotKey && (
            <span className="text-[9px] text-muted-foreground/70">
              agent ignores context
            </span>
          )}
        </div>
        <textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          placeholder="Free-form context for the agent..."
          className={cn(
            "min-h-[120px] flex-1 resize-none rounded-md border border-border/50 bg-background px-2 py-1.5 text-[11px]",
            "focus:outline-none focus:ring-1 focus:ring-ring",
          )}
        />
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={ai.isBusy || !hasTranscript}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          ai.isBusy || !hasTranscript
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {ai.isBusy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" /> Process
          </>
        )}
      </button>

      {ai.phase !== "idle" && (
        <button
          type="button"
          onClick={handleResetProcess}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border/50 px-3 py-1 text-[11px] text-muted-foreground hover:bg-accent/40"
        >
          <RotateCcw className="h-3 w-3" /> Reset response
        </button>
      )}

      <div className="text-[10px] text-muted-foreground/70">
        Phase: <span className="font-mono">{ai.phase}</span>
      </div>
    </div>
  );

  return (
    <WindowPanel
      id={windowId}
      title="AI Voice Pad"
      width={780}
      height={600}
      position="top-right"
      minWidth={560}
      minHeight={380}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={handleClose}
      urlSyncKey="voice-ai"
      urlSyncId={instanceId}
      sidebar={sidebar}
      sidebarDefaultSize={260}
      sidebarMinSize={200}
      defaultSidebarOpen={true}
      actionsRight={
        <>
          <Sparkles className="h-3.5 w-3.5 text-primary/80" />
          <MicrophoneIconButton
            id={micId}
            onTranscriptionComplete={handleTranscriptionComplete}
            onLiveTranscript={handleLiveTranscript}
            variant="icon-only"
            size="xs"
          />
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        {/* Transcript pane (top) */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            showResponsePane ? "flex-1 basis-0" : "flex-1",
          )}
        >
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Transcript
            </span>
            {hasTranscript && (
              <ActionFeedbackButton
                icon={<Trash2 />}
                tooltip="Clear transcript"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              />
            )}
          </div>

          {hasTranscript ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2">
              <textarea
                value={transcriptDisplay}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder="Transcribed text appears here..."
                className={cn(
                  "min-h-0 w-full flex-1 resize-none rounded-md border border-border/40 bg-background px-2 py-1.5 text-xs leading-snug",
                  "focus:outline-none focus:ring-1 focus:ring-ring",
                )}
              />
              {entries.length > 0 && (
                <div className="max-h-[90px] shrink-0 overflow-y-auto rounded-md border border-border/40 px-2 py-1">
                  <div className="text-[10px] font-medium text-muted-foreground/70 mb-1">
                    Session entries
                  </div>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-start gap-1 py-0.5 text-[11px] leading-tight"
                    >
                      <span className="text-muted-foreground/50 shrink-0 mt-0.5 tabular-nums">
                        {formatTime(entry.timestamp)}
                      </span>
                      <span className="flex-1 truncate text-foreground/80">
                        {entry.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEntry(entry.id)}
                        className="p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        aria-label="Remove entry"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-4 text-center">
              <button
                type="button"
                onClick={() => document.getElementById(micId)?.click()}
                className="mb-3 flex items-center justify-center rounded-full bg-primary/10 p-4 transition-colors hover:bg-primary/20"
                title="Start recording"
              >
                <Mic className="h-6 w-6 text-muted-foreground" />
              </button>
              <p className="text-[11px] text-muted-foreground">
                Tap the mic, then pick an agent and press Process.
              </p>
            </div>
          )}
        </div>

        {showResponsePane && (
          <>
            <div className="h-px bg-border/60" />
            <div className="flex min-h-0 flex-1 basis-0 flex-col">
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary/80" />
                  AI Response
                  <span className="font-mono text-[9px] text-muted-foreground/70">
                    ({ai.phase})
                  </span>
                </span>
                {(isComplete || ai.accumulatedText.length > 0) && (
                  <ActionFeedbackButton
                    icon={<Copy />}
                    tooltip="Copy response"
                    onClick={handleCopyResponse}
                    className="text-muted-foreground"
                  />
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
                {isBusyEarly && ai.accumulatedText.length === 0 ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-[11px]">
                      Launching agent — waiting for stream...
                    </span>
                  </div>
                ) : isError ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-[11px] text-destructive">
                    {ai.error ?? "Something went wrong."}
                  </div>
                ) : isComplete ? (
                  <textarea
                    value={responseValue}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    className={cn(
                      "min-h-0 w-full flex-1 resize-none rounded-md border border-border/40 bg-background px-2 py-1.5 text-xs leading-snug",
                      "focus:outline-none focus:ring-1 focus:ring-ring",
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "min-h-0 w-full flex-1 overflow-y-auto rounded-md border border-border/40 bg-muted/20 px-2 py-1.5 text-xs leading-snug whitespace-pre-wrap",
                      ai.accumulatedText.length === 0 && "text-muted-foreground italic",
                    )}
                  >
                    {ai.accumulatedText || "Waiting for response..."}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </WindowPanel>
  );
}
