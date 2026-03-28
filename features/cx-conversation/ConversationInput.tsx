"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ArrowUp,
  CornerDownLeft,
  Mic,
  ChevronDown,
  MicOff,
  Loader2,
  Plus,
  Settings2,
  Bug,
  Database,
  List,
  Layers,
} from "lucide-react";
import {
  ResponseModeButtons,
  BackToStartButton,
} from "@/features/public-chat/components/AgentSelector";

const GuidedVariableInputs = dynamic(
  () =>
    import("@/features/public-chat/components/GuidedVariableInputs").then(
      (m) => ({ default: m.GuidedVariableInputs }),
    ),
  { ssr: false },
);

const PublicVariableInputs = dynamic(
  () =>
    import("@/features/public-chat/components/PublicVariableInputs").then(
      (m) => ({ default: m.PublicVariableInputs }),
    ),
  { ssr: false },
);
import {
  TapTargetButtonTransparent,
  TapTargetButtonSolid,
} from "@/app/(ssr)/_components/core/TapTargetButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { chatConversationsActions } from "@/features/cx-conversation/redux/slice";
import { sendMessage } from "@/features/cx-conversation/redux/thunks/sendMessage";
import {
  selectCurrentInput,
  selectResources,
  selectVariableDefaults,
  selectIsExecuting,
  selectExpandedVariable,
  selectShowVariables,
  selectUIState,
  selectShowDebugInfo,
} from "@/features/cx-conversation/redux/selectors";
import {
  selectAvailableModels,
  selectModelOptions,
  fetchAvailableModels,
} from "@/lib/redux/slices/modelRegistrySlice";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { selectActiveChatAgent } from "@/lib/redux/slices/activeChatSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { ResourceChips } from "@/features/prompts/components/resource-display";
import { ResourcePickerMenu } from "@/features/prompts/components/resource-picker/ResourcePickerMenu";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { useRecordAndTranscribe, TranscriptionLoader } from "@/features/audio";
import { ModelSettingsDialog } from "@/features/prompts/components/configuration/ModelSettingsDialog";
import { ChatDebugModal } from "./ChatDebugModal";
import { toast } from "sonner";
import type { Resource } from "@/features/prompts/types/resources";
import type { PromptSettings } from "@/features/prompts/types/core";

// ============================================================================
// PROPS
// ============================================================================

export interface ConversationInputProps {
  sessionId: string;

  // ── Feature flags (all default off unless noted) ───────────────────────────
  showVariables?: boolean;
  showVoice?: boolean; // default: true
  showResourcePicker?: boolean; // default: true
  showModelPicker?: boolean; // inline model selector for dynamic_model agents
  showSettings?: boolean; // settings icon (opens ModelSettingsDialog)
  showAgentPicker?: boolean;
  showSubmitOnEnterToggle?: boolean;
  showAutoClearToggle?: boolean;

  // ── Configuration ──────────────────────────────────────────────────────────
  variableMode?: "guided" | "classic";
  uploadBucket?: string;
  uploadPath?: string;
  sendButtonVariant?: "gray" | "blue" | "default";
  seamless?: boolean; // borderless style for embedded layouts
  placeholder?: string;
  compact?: boolean;
  showShiftEnterHint?: boolean;
  /**
   * When true, renders a single-line input with flat top corners — designed to
   * attach seamlessly below a variable inputs component. The input still grows
   * but starts as one line instead of the tall welcome-screen textarea.
   */
  singleLine?: boolean;

  /** Attachment capabilities derived from model settings — gates resource types */
  attachmentCapabilities?: {
    supportsImageUrls?: boolean;
    supportsFileUrls?: boolean;
    supportsYoutubeVideos?: boolean;
    supportsAudio?: boolean;
  };

  // ── Callbacks ──────────────────────────────────────────────────────────────
  onSend?: () => void;
  /**
   * When provided, intercepts submit instead of dispatching sendMessage.
   * Receives the current input content and resources from Redux.
   * Return true to clear the input after submit, false to keep it.
   * Used by the welcome screen to queue the firstMessage and navigate to /c/.
   */
  onSubmitOverride?: (
    content: string,
    resources: Resource[],
  ) => Promise<boolean>;

  // ── Footer row ─────────────────────────────────────────────────────────────
  /**
   * When true, renders a footer row below the input:
   *   - BackToStartButton when variables are present
   *   - ResponseModeButtons when no variables
   *   - Layout toggle (guided ↔ classic) when variables are present
   */
  showFooter?: boolean;
  /** Label shown in BackToStartButton */
  agentName?: string;
  /** Called when BackToStartButton is clicked */
  onBackToStart?: () => void;
  /** Called when a ResponseModeButton is clicked */
  onAgentModeSelect?: (modeId: string, agentId: string | null) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConversationInput({
  sessionId,
  showVariables = false,
  showVoice = true,
  showResourcePicker = true,
  showModelPicker = false,
  showSettings = false,
  showAgentPicker = false,
  showSubmitOnEnterToggle = false,
  showAutoClearToggle = false,
  variableMode = "guided",
  uploadBucket = "userContent",
  uploadPath = "prompt-attachments",
  sendButtonVariant = "blue",
  seamless = false,
  placeholder = "Ask anything",
  compact = false,
  showShiftEnterHint = false,
  singleLine = false,
  attachmentCapabilities,
  onSend,
  onSubmitOverride,
  showFooter = false,
  agentName,
  onBackToStart,
  onAgentModeSelect,
}: ConversationInputProps) {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceSubmitRef = useRef(false);
  const [submitOnEnter, setSubmitOnEnter] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  // ── Redux state ────────────────────────────────────────────────────────────
  const content = useAppSelector((state) =>
    selectCurrentInput(state, sessionId),
  );
  const resources = useAppSelector((state) =>
    selectResources(state, sessionId),
  );
  const variableDefaults = useAppSelector((state) =>
    selectVariableDefaults(state, sessionId),
  );
  const isExecuting = useAppSelector((state) =>
    selectIsExecuting(state, sessionId),
  );
  const expandedVariable = useAppSelector((state) =>
    selectExpandedVariable(state, sessionId),
  );
  const showVarsInState = useAppSelector((state) =>
    selectShowVariables(state, sessionId),
  );
  const uiState = useAppSelector((state) => selectUIState(state, sessionId));

  const session = useAppSelector(
    (state) => state.chatConversations.sessions[sessionId],
  );
  const agentId = session?.agentId ?? "";
  const conversationId = session?.conversationId ?? null;

  // ── Agent (for footer ResponseModeButtons) ────────────────────────────────
  const selectedAgent = useAppSelector(selectActiveChatAgent);

  // ── Admin / debug ──────────────────────────────────────────────────────────
  const isAdmin = useAppSelector(selectIsAdmin);
  const isGlobalDebugMode = useAppSelector(selectIsDebugMode);
  const showDebugInfo = useAppSelector((s) =>
    selectShowDebugInfo(s, sessionId),
  );

  // ── URL params (for variable layout toggle) ───────────────────────────────
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const useGuidedVars = searchParams.get("vars") !== "classic";

  const toggleUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (useGuidedVars) {
      params.set("vars", "classic");
    } else {
      params.delete("vars");
    }
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [useGuidedVars, searchParams, pathname]);

  // Flat values map from variableDefaults — for variable input components
  const variableValues = useMemo(
    () =>
      Object.fromEntries(
        variableDefaults.map((v) => [v.name, v.defaultValue ?? ""]),
      ),
    [variableDefaults],
  );

  const handleVariableChange = useCallback(
    (name: string, value: string) => {
      dispatch(
        chatConversationsActions.updateVariable({
          sessionId,
          variableName: name,
          value,
        }),
      );
    },
    [dispatch, sessionId],
  );

  // ── Model registry ─────────────────────────────────────────────────────────
  const modelOptions = useAppSelector(selectModelOptions);
  const availableModels = useAppSelector(selectAvailableModels);

  // Ensure models are loaded when model picker or settings are shown
  useEffect(() => {
    if ((showModelPicker || showSettings) && availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [showModelPicker, showSettings, availableModels.length, dispatch]);

  const currentModelId = uiState?.modelOverride || null;
  const currentModelName = currentModelId
    ? (modelOptions.find((m) => m.value === currentModelId)?.label ??
      currentModelId)
    : null;

  // ── Resource picker state ──────────────────────────────────────────────────
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);

  // ── File upload ────────────────────────────────────────────────────────────
  const { uploadFile, isLoading: isUploading } = useFileUploadWithStorage(
    uploadBucket,
    uploadPath,
  );

  const handleFilesSelected = useCallback(
    async (files: FileList | File[]) => {
      const filesArray = Array.from(files);
      for (const file of filesArray) {
        try {
          const result = await uploadFile(file);
          if (!result) throw new Error("Upload returned no result");
          const resource: Resource = {
            type: file.type.startsWith("image/") ? "image_link" : "file",
            data: {
              url: result.url,
              filename: file.name,
              mime_type: file.type,
              size: file.size,
            },
          } as unknown as Resource;
          dispatch(
            chatConversationsActions.addResource({ sessionId, resource }),
          );
        } catch (err) {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [dispatch, sessionId, uploadFile],
  );

  const handleResourceSelected = useCallback(
    (resource: { type: string; data: unknown }) => {
      dispatch(
        chatConversationsActions.addResource({
          sessionId,
          resource: resource as Resource,
        }),
      );
      setIsResourcePickerOpen(false);
    },
    [dispatch, sessionId],
  );

  // ── Clipboard paste ────────────────────────────────────────────────────────
  useClipboardPaste({
    textareaRef,
    onPasteImage: async (file) => {
      await handleFilesSelected([file]);
    },
  });

  // ── Voice / transcribe ─────────────────────────────────────────────────────
  const { isRecording, isTranscribing, startRecording, stopRecording } =
    useRecordAndTranscribe({
      onTranscriptionComplete: (result) => {
        if (!result.success || !result.text) return;
        const newContent = content ? `${content} ${result.text}` : result.text;
        dispatch(
          chatConversationsActions.setCurrentInput({
            sessionId,
            input: newContent,
          }),
        );
        if (pendingVoiceSubmitRef.current) {
          pendingVoiceSubmitRef.current = false;
          handleSubmit(newContent);
        }
      },
      onError: (err) =>
        toast.error("Transcription failed", { description: err }),
    });

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      const maxH = 200;
      textareaRef.current.style.height = `${Math.min(scrollH, maxH)}px`;
    }
  }, [content]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (overrideContent?: string) => {
      const finalContent = (overrideContent ?? content).trim();
      if (!finalContent || isExecuting) return;

      // Welcome screen override — intercepts submit before sendMessage
      if (onSubmitOverride) {
        const shouldClear = await onSubmitOverride(finalContent, resources);
        if (shouldClear) {
          dispatch(
            chatConversationsActions.setCurrentInput({ sessionId, input: "" }),
          );
          dispatch(chatConversationsActions.clearResources(sessionId));
        }
        onSend?.();
        return;
      }

      if (!agentId) return;

      // Build variables from variableDefaults
      const variables: Record<string, string> = {};
      variableDefaults.forEach((v) => {
        if (v.defaultValue !== undefined && v.defaultValue !== null) {
          variables[v.name] = String(v.defaultValue);
        }
      });

      // Convert Resource[] to ConversationResource[] for the API
      const conversationResources =
        resources.length > 0
          ? resources.map((r) => ({
              type: r.type,
              data: r.data as Record<string, unknown>,
            }))
          : undefined;

      dispatch(
        sendMessage({
          sessionId,
          content: finalContent,
          resources: conversationResources,
          variables: Object.keys(variables).length > 0 ? variables : undefined,
        }),
      );

      dispatch(
        chatConversationsActions.setCurrentInput({ sessionId, input: "" }),
      );
      dispatch(chatConversationsActions.clearResources(sessionId));
      onSend?.();
    },
    [
      content,
      isExecuting,
      agentId,
      sessionId,
      variableDefaults,
      resources,
      dispatch,
      onSend,
      onSubmitOverride,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (submitOnEnter && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (
      !submitOnEnter &&
      e.key === "Enter" &&
      (e.metaKey || e.ctrlKey)
    ) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Model override ─────────────────────────────────────────────────────────
  const handleModelSelect = useCallback(
    (modelId: string) => {
      dispatch(
        chatConversationsActions.updateUIState({
          sessionId,
          updates: { modelOverride: modelId },
        }),
      );
      setIsModelPickerOpen(false);
    },
    [dispatch, sessionId],
  );

  // ── Settings dialog ────────────────────────────────────────────────────────
  // Build PromptSettings from current uiState for the dialog
  const settingsForDialog: PromptSettings = {
    model_id: uiState?.modelOverride ?? undefined,
    ...((uiState?.modelSettings as Record<string, unknown>) ?? {}),
  };

  const handleSettingsChange = useCallback(
    (newSettings: PromptSettings) => {
      const { model_id, ...restSettings } = newSettings;
      if (model_id) {
        dispatch(
          chatConversationsActions.updateUIState({
            sessionId,
            updates: { modelOverride: model_id },
          }),
        );
      }
      // Store full model settings (temperature, max_tokens, etc.)
      dispatch(
        chatConversationsActions.updateUIState({
          sessionId,
          updates: { modelSettings: restSettings },
        }),
      );
    },
    [dispatch, sessionId],
  );

  const hasVariables = variableDefaults.length > 0;
  const hasContent = content.trim().length > 0;
  const isDisabled = isExecuting || (!agentId && !onSubmitOverride);

  const containerClass = [
    "flex flex-col gap-1.5 w-full bg-background",
    seamless
      ? ""
      : singleLine
        ? "border border-border rounded-b-2xl rounded-t-none border-t-0 py-1"
        : "border border-border rounded-3xl py-2",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      {/* ── Admin global debug toolbar ────────────────────────────────── */}
      {isAdmin && isGlobalDebugMode && (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-950/20 border-b border-red-800/40 rounded-t-2xl">
          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">
            Debug
          </span>
          <button
            onClick={() => setIsDebugModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-medium rounded transition-colors"
            title="Open debug modal"
          >
            <Database className="w-2.5 h-2.5" />
            <span>Session State</span>
          </button>
          <span className="text-[9px] text-red-400/70 font-mono truncate">
            {sessionId.slice(0, 8)}…
          </span>
        </div>
      )}

      {/* ── Variable inputs ────────────────────────────────────────────── */}
      {hasVariables && useGuidedVars && (
        <GuidedVariableInputs
          variableDefaults={variableDefaults}
          values={variableValues}
          onChange={handleVariableChange}
          disabled={isExecuting}
          submitOnEnter
          onSubmit={onSubmitOverride}
          seamless
        />
      )}
      {hasVariables && !useGuidedVars && (
        <div className="max-h-[30vh] md:max-h-[45vh] overflow-y-auto overscroll-contain rounded-xl">
          <PublicVariableInputs
            variableDefaults={variableDefaults}
            values={variableValues}
            onChange={handleVariableChange}
            disabled={isExecuting}
            minimal
            onSubmit={onSubmitOverride}
            submitOnEnter
          />
        </div>
      )}

      {/* ── Resource chips ────────────────────────────────────────────── */}
      {resources.length > 0 && (
        <div className="px-3">
          <ResourceChips
            resources={resources}
            onRemove={(resource) => {
              const r = resource as unknown as { id: string };
              dispatch(
                chatConversationsActions.removeResource({
                  sessionId,
                  resourceId: r.id ?? "",
                }),
              );
            }}
            onPreview={(resource) => {
              setPreviewResource(resource);
              setPreviewSheetOpen(true);
            }}
          />
        </div>
      )}

      {/* ── Transcribing loader ───────────────────────────────────────── */}
      {isTranscribing && <TranscriptionLoader />}

      {/* ── Textarea row ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {/* + Resource picker button with popover */}
        {showResourcePicker && (
          <Popover
            open={isResourcePickerOpen}
            onOpenChange={setIsResourcePickerOpen}
          >
            <PopoverTrigger asChild>
              <TapTargetButtonTransparent
                ariaLabel="Add attachments"
                icon={
                  isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  )
                }
              />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-56 p-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <ResourcePickerMenu
                onResourceSelected={handleResourceSelected}
                onClose={() => setIsResourcePickerOpen(false)}
                attachmentCapabilities={
                  attachmentCapabilities ?? {
                    supportsImageUrls: true,
                    supportsFileUrls: true,
                    supportsYoutubeVideos: true,
                    supportsAudio: true,
                  }
                }
              />
            </PopoverContent>
          </Popover>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) =>
            dispatch(
              chatConversationsActions.setCurrentInput({
                sessionId,
                input: e.target.value,
              }),
            )
          }
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Recording..." : placeholder}
          disabled={isDisabled || isRecording}
          className={[
            "flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground",
            "focus:outline-none overflow-y-auto leading-[18px]",
            singleLine
              ? "py-[7px] min-h-[34px] max-h-[34px]"
              : "py-[9px] min-h-[36px] max-h-[200px]",
            compact ? "text-xs" : "text-sm",
          ].join(" ")}
          style={{ fontSize: "16px" }} // iOS zoom prevention
          rows={1}
        />

        {/* Settings button */}
        {showSettings && (
          <TapTargetButtonTransparent
            onClick={() => setIsSettingsOpen(true)}
            ariaLabel="Settings"
            icon={<Settings2 className="w-4 h-4 text-muted-foreground" />}
          />
        )}

        {/* Admin bug button — only shown for admins */}
        {isAdmin && (
          <TapTargetButtonTransparent
            onClick={() => setIsDebugModalOpen(true)}
            ariaLabel="Admin debug options"
            icon={
              <Bug
                className={`w-4 h-4 ${showDebugInfo ? "text-red-500" : "text-muted-foreground"}`}
              />
            }
          />
        )}

        {/* Voice button */}
        {showVoice && (
          <TapTargetButtonTransparent
            onClick={handleVoiceMicToggle}
            ariaLabel={isRecording ? "Stop recording" : "Start recording"}
            icon={
              isTranscribing && !isRecording ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : isRecording ? (
                <MicOff className="w-4 h-4 text-red-500" />
              ) : (
                <Mic className="w-4 h-4 text-muted-foreground" />
              )
            }
          />
        )}

        {/* Send button */}
        <TapTargetButtonSolid
          onClick={() => handleSubmit()}
          disabled={!hasContent || isDisabled || isUploading}
          ariaLabel="Send message"
          bgColor={sendButtonVariant === "gray" ? "bg-muted" : "bg-blue-600"}
          hoverBgColor={
            sendButtonVariant === "gray"
              ? "hover:bg-muted/80"
              : "hover:bg-blue-700"
          }
          iconColor={
            sendButtonVariant === "gray" ? "text-foreground" : "text-white"
          }
          icon={
            isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )
          }
        />
      </div>

      {/* ── Model picker (inline, text-only for dynamic_model agents) ── */}
      {showModelPicker && (
        <div className="relative px-3">
          <button
            type="button"
            onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{currentModelName || "Select model"}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {isModelPickerOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-64 max-h-60 overflow-y-auto rounded-xl border border-border bg-background shadow-lg z-50">
              {modelOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleModelSelect(opt.value)}
                  className={[
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                    currentModelId === opt.value
                      ? "text-primary font-medium"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Submit hint ───────────────────────────────────────────────── */}
      {showShiftEnterHint && (
        <p className="text-[10px] text-muted-foreground/60 px-3">
          <kbd className="text-[9px]">⌘+Enter</kbd> to send,{" "}
          <kbd className="text-[9px]">Shift+Enter</kbd> for new line
        </p>
      )}

      {/* ── Submit-on-enter toggle ─────────────────────────────────────── */}
      {showSubmitOnEnterToggle && (
        <div className="flex items-center gap-2 px-3">
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSubmitOnEnter(!submitOnEnter)}
          >
            <div
              className={`w-6 h-3.5 rounded-full transition-colors ${submitOnEnter ? "bg-blue-500" : "bg-muted"} relative`}
            >
              <div
                className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${submitOnEnter ? "translate-x-[13px]" : "translate-x-0.5"}`}
              />
            </div>
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter to send</span>
          </button>
        </div>
      )}

      {/* ── Settings dialog (ModelSettingsDialog) ─────────────────────── */}
      {showSettings && (
        <ModelSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          modelId={uiState?.modelOverride ?? ""}
          models={availableModels}
          settings={settingsForDialog}
          onSettingsChange={handleSettingsChange}
        />
      )}

      {/* ── Admin debug modal ──────────────────────────────────────────── */}
      {isAdmin && (
        <ChatDebugModal
          sessionId={sessionId}
          isOpen={isDebugModalOpen}
          onClose={() => setIsDebugModalOpen(false)}
        />
      )}

      {/* ── Footer row (back button / response modes / layout toggle) ─── */}
      {showFooter && (
        <div className="flex items-center justify-between mt-2 pb-1">
          {hasVariables ? (
            <BackToStartButton
              onBack={onBackToStart ?? (() => {})}
              agentName={agentName}
            />
          ) : (
            <ResponseModeButtons
              disabled={isExecuting}
              selectedAgentId={selectedAgent.promptId}
              onModeSelect={onAgentModeSelect ?? (() => {})}
            />
          )}
          {hasVariables && (
            <button
              type="button"
              onClick={() => router.replace(toggleUrl)}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
              title={
                useGuidedVars
                  ? "Switch to classic variable view"
                  : "Switch to guided variable view"
              }
            >
              {useGuidedVars ? (
                <List className="w-4 h-4" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ConversationInput;
