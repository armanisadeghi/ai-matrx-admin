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
import {
  Copy,
  Files,
  Loader2,
  Maximize2,
  Minimize2,
  Stars,
  Trash2,
} from "lucide-react";
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
import { ContentActionBar } from "@/components/content-actions/ContentActionBar";
import { useSetting } from "@/features/settings/hooks/useSetting";
import type { CustomCleanerAgent } from "@/lib/redux/slices/userPreferencesSlice";
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
  const [isCompact, setIsCompact] = useState(false);

  const ai = useAiPostProcess();

  // Custom user-defined cleaners (from preferences) merged into the picker
  // alongside the system-owned agents. Empty by default.
  const [customAgents] = useSetting<CustomCleanerAgent[]>(
    "userPreferences.transcription.customCleanerAgents",
  );
  const allAgents = useMemo<AiPostProcessAgent[]>(() => {
    if (!customAgents || customAgents.length === 0)
      return AI_POST_PROCESS_AGENTS;
    const customMapped: AiPostProcessAgent[] = customAgents.map((a) => ({
      id: a.id,
      name: a.displayName,
      transcriptVariableKey: a.transcriptVariableKey,
      contextSlotKey: a.contextSlotKey,
      contextVariableKey: a.contextVariableKey,
    }));
    return [...AI_POST_PROCESS_AGENTS, ...customMapped];
  }, [customAgents]);

  // Keep the latest selection + context so the async transcription-complete
  // callback can read them without stale closures.
  const agentIdRef = useRef(agentId);
  const contextRef = useRef(userContext);
  agentIdRef.current = agentId;
  contextRef.current = userContext;

  // Copy-safe refs — always hold the latest rendered values so clipboard
  // handlers work correctly regardless of display mode (including compact/floating).
  const responseRef = useRef<string>("");
  const transcriptDisplayRef = useRef<string>("");

  const windowId = `voice-pad-ai-${instanceId}`;
  const micId = `voice-pad-ai-mic-${instanceId}`;

  const selectedAgent = useMemo<AiPostProcessAgent>(
    () => allAgents.find((a) => a.id === agentId) ?? allAgents[0],
    [agentId, allAgents],
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
  transcriptDisplayRef.current = transcriptDisplay;

  // Invariant: what we send to the AI MUST equal what the user sees in the
  // transcript textarea. `baseText` is derived from Redux (draftText ?? entries)
  // and changes on every keystroke. Async flows (auto-process on transcription
  // complete, mic callback that may have been captured by a child component)
  // must read the latest value via a ref to avoid stale-closure drift between
  // the textarea and the AI input.
  const baseTextRef = useRef(baseText);
  baseTextRef.current = baseText;

  const handleClose = useCallback(() => {
    dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId }));
  }, [dispatch, instanceId]);

  const handleTranscriptionComplete = useCallback(
    (text: string) => {
      setLiveTranscript("");
      const trimmed = text.trim();
      if (!trimmed) return;

      // Read the current visible baseText (which includes any user edits in
      // draftText) and append the new transcript to it. This exact string is
      // both rendered in the textarea and sent to the agent.
      const previous = baseTextRef.current;
      const combined = previous ? previous + "\n\n" + trimmed : trimmed;

      dispatch(addTranscriptEntry({ overlayId: OVERLAY_ID, instanceId, text }));
      // Lock draftText to `combined` so the textarea renders exactly what we
      // just sent to the AI. Without this, a pre-existing draftText would
      // diverge from the newly appended entries and the visible text would no
      // longer match the model input.
      dispatch(
        setDraftText({ overlayId: OVERLAY_ID, instanceId, text: combined }),
      );
      baseTextRef.current = combined;

      const agent =
        allAgents.find((a) => a.id === agentIdRef.current) ?? allAgents[0];
      setEditedResponse(null);
      ai.process({
        agent,
        transcript: combined,
        context: contextRef.current,
      });
    },
    [ai, dispatch, instanceId, allAgents],
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
      dispatch(
        setDraftText({ overlayId: OVERLAY_ID, instanceId, text: value }),
      );
    },
    [dispatch, instanceId],
  );

  const handleProcess = useCallback(() => {
    // Always read the latest visible text via the ref. Same invariant as the
    // auto-process path: the string sent to the agent must equal the string
    // in the textarea at the moment of submission.
    const transcript = baseTextRef.current.trim();
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
  }, [ai, selectedAgent, userContext]);

  const handleCopyResponse = useCallback(async () => {
    const text = responseRef.current.trim();
    if (!text) {
      toast.info("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(responseRef.current);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — try selecting the text and copying manually");
    }
  }, []);

  const handleCopyTranscript = useCallback(async () => {
    const text = transcriptDisplayRef.current.trim();
    if (!text) {
      toast.info("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(transcriptDisplayRef.current);
      toast.success("Transcript copied");
    } catch {
      toast.error("Copy failed — try selecting the text and copying manually");
    }
  }, []);

  const handleCopyJoined = useCallback(async () => {
    const transcript = transcriptDisplayRef.current.trim();
    const response = responseRef.current.trim();
    if (!transcript && !response) {
      toast.info("Nothing to copy yet");
      return;
    }
    const parts: string[] = [];
    if (transcript) parts.push(transcript);
    if (response) parts.push(response);
    try {
      await navigator.clipboard.writeText(parts.join("\n\n---\n\n"));
      toast.success("Both copied to clipboard");
    } catch {
      toast.error("Copy failed — try selecting the text and copying manually");
    }
  }, []);

  const handleToggleCompact = useCallback(() => setIsCompact((v) => !v), []);

  const responseValue = editedResponse ?? ai.accumulatedText;
  responseRef.current = responseValue;
  const isBusyEarly =
    ai.phase === "launching" ||
    ai.phase === "pending" ||
    ai.phase === "connecting";
  const responsePlaceholder =
    ai.phase === "idle"
      ? "Your cleaned transcript will appear here after recording..."
      : isBusyEarly && ai.accumulatedText.length === 0
        ? "Analyzing your transcript..."
        : ai.phase === "error"
          ? (ai.error ?? "Something went wrong. Please try again.")
          : "Preparing your response...";

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Agent
        </div>
        <div className="flex flex-col gap-1">
          {allAgents.map((agent) => (
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
                      {" "}
                      · ctx: <code>{agent.contextSlotKey}</code>
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
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Stars className="h-3.5 w-3.5" /> Clean Up
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <WindowPanel
      id={windowId}
      title="Transcription Cleanup"
      width={820}
      height={620}
      position="top-right"
      minWidth={600}
      minHeight={420}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      onClose={handleClose}
      urlSyncKey="voice-ai"
      urlSyncId={instanceId}
      sidebar={isCompact ? undefined : sidebar}
      sidebarDefaultSize={isCompact ? undefined : 260}
      sidebarMinSize={isCompact ? undefined : 220}
      defaultSidebarOpen={!isCompact}
      actionsRight={
        <>
          <MicrophoneIconButton
            id={micId}
            onTranscriptionComplete={handleTranscriptionComplete}
            onLiveTranscript={handleLiveTranscript}
            variant="icon-only"
            size="xs"
          />
          <ActionFeedbackButton
            icon={isCompact ? <Maximize2 /> : <Minimize2 />}
            tooltip={
              isCompact
                ? "Expand to full view"
                : "Compact — shrink to a floating widget"
            }
            onClick={handleToggleCompact}
            className="text-muted-foreground"
          />
        </>
      }
    >
      {isCompact ? (
        /* ── Compact floating widget ─────────────────────────────────────── */
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-background px-4 py-4">
          {/* Status row */}
          <div className="flex items-center gap-2 text-[11px]">
            {ai.isBusy ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                Analyzing your transcript…
              </span>
            ) : ai.phase === "complete" && responseValue.trim() ? (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Response ready
              </span>
            ) : (
              <span className="text-muted-foreground/70">
                {entries.length > 0
                  ? `${entries.length} recording${entries.length !== 1 ? "s" : ""}`
                  : "Ready to record"}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <ActionFeedbackButton
              icon={<Copy />}
              tooltip="Copy original transcript"
              onClick={handleCopyTranscript}
              className="text-muted-foreground"
            />
            <ActionFeedbackButton
              icon={<Stars />}
              tooltip="Copy AI response"
              onClick={handleCopyResponse}
              className="text-primary/70"
            />
            <ActionFeedbackButton
              icon={<Files />}
              tooltip="Copy transcript + AI response"
              onClick={handleCopyJoined}
              className="text-muted-foreground"
            />
            {entries.length > 0 && (
              <ActionFeedbackButton
                icon={<Trash2 />}
                tooltip="Clear everything and start over"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              />
            )}
          </div>

          {/* Re-process button */}
          <button
            type="button"
            onClick={handleProcess}
            disabled={ai.isBusy || !transcriptDisplay.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-medium transition-colors",
              ai.isBusy || !transcriptDisplay.trim()
                ? "border-transparent bg-muted text-muted-foreground cursor-not-allowed"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            {ai.isBusy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Stars className="h-3 w-3" /> Clean Up
              </>
            )}
          </button>
        </div>
      ) : (
        /* ── Full layout ─────────────────────────────────────────────────── */
        <div className="flex h-full min-h-0 flex-col bg-background">
          {/* Top half: transcript */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between px-3 py-1.5 border-b border-border/40">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Transcript{" "}
                <span className="text-muted-foreground/60">
                  ({entries.length})
                </span>
              </span>
              <div className="flex items-center gap-1">
                {transcriptDisplay.trim().length > 0 && (
                  <>
                    <ContentActionBar
                      content={transcriptDisplay}
                      title="Voice Pad Transcript"
                      instanceKey={`voice-pad-ai-transcript-${instanceId}`}
                      hideSpeaker
                      hidePencil
                      hideCopy
                    />
                    <ActionFeedbackButton
                      icon={<Copy />}
                      tooltip="Copy transcript"
                      onClick={handleCopyTranscript}
                      className="text-muted-foreground"
                    />
                  </>
                )}
                <ActionFeedbackButton
                  icon={<Trash2 />}
                  tooltip="Clear transcript"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                />
              </div>
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
                <Stars className="h-3 w-3 text-primary/80" />
                AI Response
                {ai.phase === "complete" && responseValue.trim() && (
                  <span className="normal-case font-normal text-green-600 dark:text-green-400">
                    · Ready
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {isBusyEarly && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                {ai.phase === "complete" && responseValue.trim().length > 0 && (
                  <ContentActionBar
                    content={responseValue}
                    title={`AI-cleaned: ${selectedAgent.name}`}
                    metadata={{
                      agent_id: selectedAgent.id,
                      agent_name: selectedAgent.name,
                      source: "voice-pad-ai",
                    }}
                    instanceKey={`voice-pad-ai-response-${instanceId}`}
                    hideSpeaker
                    hidePencil
                    hideCopy
                  />
                )}
                <ActionFeedbackButton
                  icon={<Copy />}
                  tooltip="Copy AI response"
                  onClick={handleCopyResponse}
                  className="text-muted-foreground"
                />
                <ActionFeedbackButton
                  icon={<Files />}
                  tooltip="Copy transcript + AI response"
                  onClick={handleCopyJoined}
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
      )}
    </WindowPanel>
  );
}
