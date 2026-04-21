"use client";

/**
 * VoicePadAi — voice pad with AI post-processing.
 *
 * - Sidebar: agent picker + context textarea + Process button.
 * - Main body: transcript textarea on top, AI response textarea on bottom.
 *   Both are always rendered (even when empty) so the split is stable.
 * - Auto-processing: when a transcription completes, the agent fires
 *   immediately — the user doesn't have to click Process.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Copy, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  selectVoicePadEntries,
  selectVoicePadDraftText,
  addTranscriptEntry,
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

  // Keep the latest selection + context so the async transcription-complete
  // callback can read them without stale closures.
  const agentIdRef = useRef(agentId);
  const contextRef = useRef(userContext);
  agentIdRef.current = agentId;
  contextRef.current = userContext;

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
      const trimmed = text.trim();
      if (!trimmed) return;

      dispatch(
        addTranscriptEntry({ overlayId: OVERLAY_ID, instanceId, text }),
      );

      // Auto-fire the agent as soon as transcription lands.
      const combined = allText ? allText + "\n\n" + trimmed : trimmed;
      const agent =
        AI_POST_PROCESS_AGENTS.find((a) => a.id === agentIdRef.current) ??
        AI_POST_PROCESS_AGENTS[0];
      setEditedResponse(null);
      ai.process({
        agent,
        transcript: combined,
        context: contextRef.current,
      });
    },
    [ai, allText, dispatch, instanceId],
  );

  const handleLiveTranscript = useCallback((text: string) => {
    setLiveTranscript(text);
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch(clearAllEntries({ overlayId: OVERLAY_ID, instanceId }));
    ai.reset();
    setEditedResponse(null);
  }, [ai, dispatch, instanceId]);

  const handleDraftChange = useCallback(
    (value: string) => {
      dispatch(setDraftText({ overlayId: OVERLAY_ID, instanceId, text: value }));
    },
    [dispatch, instanceId],
  );

  const handleProcess = useCallback(() => {
    const transcript = baseText.trim();
    if (!transcript) {
      toast.info("Record or type a transcript first");
      return;
    }
    setEditedResponse(null);
    ai.process({
      agent: selectedAgent,
      transcript,
      context: userContext,
    });
  }, [ai, baseText, selectedAgent, userContext]);

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

  const responseValue = editedResponse ?? ai.accumulatedText;
  const isBusyEarly =
    ai.phase === "launching" ||
    ai.phase === "pending" ||
    ai.phase === "connecting";
  const responsePlaceholder =
    ai.phase === "idle"
      ? "AI response appears here once transcription is processed..."
      : isBusyEarly && ai.accumulatedText.length === 0
      ? "Launching agent..."
      : ai.phase === "error"
      ? ai.error ?? "Something went wrong."
      : "Waiting for response...";

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Agent
        </div>
        <div className="flex flex-col gap-1">
          {AI_POST_PROCESS_AGENTS.map((agent) => (
            <label
              key={agent.id}
              className={cn(
                "flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors text-xs",
                agent.id === agentId
                  ? "bg-primary/10 border-primary/50"
                  : "border-border/50 hover:bg-accent/40",
              )}
            >
              <input
                type="radio"
                name={`voice-pad-ai-agent-${instanceId}`}
                value={agent.id}
                checked={agent.id === agentId}
                onChange={() => setAgentId(agent.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-medium leading-tight">
                  {agent.name}
                </span>
                <span className="text-[10px] text-muted-foreground/80 leading-tight break-all">
                  var: <code>{agent.transcriptVariableKey}</code>
                  {agent.contextSlotKey && (
                    <>
                      {" "}· ctx: <code>{agent.contextSlotKey}</code>
                    </>
                  )}
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Context
        </div>
        <textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          placeholder="Free-form context for the agent..."
          className={cn(
            "mt-1 min-h-[120px] w-full resize-none rounded-md border border-border/50 bg-background px-2 py-1.5 text-[11px]",
            "focus:outline-none focus:ring-1 focus:ring-ring",
          )}
        />
      </div>

      <div className="shrink-0 border-t border-border/50 p-2 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleProcess}
          disabled={ai.isBusy}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            ai.isBusy
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
        <div className="text-[10px] text-muted-foreground/70 text-center">
          Phase: <span className="font-mono">{ai.phase}</span>
        </div>
      </div>
    </div>
  );

  return (
    <WindowPanel
      id={windowId}
      title="AI Voice Pad"
      width={820}
      height={620}
      position="top-right"
      minWidth={600}
      minHeight={420}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={handleClose}
      urlSyncKey="voice-ai"
      urlSyncId={instanceId}
      sidebar={sidebar}
      sidebarDefaultSize={260}
      sidebarMinSize={220}
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
        {/* Top half: transcript */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 py-1.5 border-b border-border/40">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Transcript{" "}
              <span className="text-muted-foreground/60">
                ({entries.length})
              </span>
            </span>
            <ActionFeedbackButton
              icon={<Trash2 />}
              tooltip="Clear transcript"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            />
          </div>
          <textarea
            value={transcriptDisplay}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder="Tap the mic in the header to record. Transcribed text appears here and is processed automatically..."
            className={cn(
              "flex-1 min-h-0 w-full resize-none border-0 bg-background px-3 py-2 text-sm leading-snug",
              "focus:outline-none focus:ring-0",
            )}
          />
        </div>

        {/* Divider */}
        <div className="h-px shrink-0 bg-border/60" />

        {/* Bottom half: AI response */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 py-1.5 border-b border-border/40">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary/80" />
              AI Response
              <span className="font-mono text-[9px] text-muted-foreground/70">
                ({ai.phase})
              </span>
            </span>
            <div className="flex items-center gap-1">
              {isBusyEarly && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <ActionFeedbackButton
                icon={<Copy />}
                tooltip="Copy response"
                onClick={handleCopyResponse}
                className="text-muted-foreground"
              />
            </div>
          </div>
          <textarea
            value={responseValue}
            onChange={(e) => setEditedResponse(e.target.value)}
            placeholder={responsePlaceholder}
            className={cn(
              "flex-1 min-h-0 w-full resize-none border-0 bg-background px-3 py-2 text-sm leading-snug",
              "focus:outline-none focus:ring-0",
              ai.phase === "error" && "text-destructive",
            )}
          />
        </div>
      </div>
    </WindowPanel>
  );
}
