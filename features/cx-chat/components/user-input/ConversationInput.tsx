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
  CornerDownLeft,
  ChevronDown,
  Loader2,
  Database,
  List,
  Layers,
} from "lucide-react";
import { ResponseModeButtons, BackToStartButton } from "./InpuControlButtons";

const GuidedVariableInputs = dynamic(
  () =>
    import("@/features/cx-chat/components/user-input/GuidedVariableInputs").then(
      (m) => ({ default: m.GuidedVariableInputs }),
    ),
  { ssr: false },
);

const StackedVariableInputs = dynamic(
  () =>
    import("@/features/cx-chat/components/user-input/StackedVariableInputs").then(
      (m) => ({ default: m.StackedVariableInputs }),
    ),
  { ssr: false },
);
import { TapTargetButtonTransparent } from "@/components/icons/TapTargetButton";
import { PlusTapButton } from "@/components/icons/tap-buttons";
import { InputActionButtons } from "./InputActionButtons";
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
  selectUIState,
  selectShowDebugInfo,
  selectHasVariables,
  selectAgentId,
  selectEffectiveModelId,
  selectEffectiveModelLabel,
  selectEffectiveSettings,
} from "@/features/cx-conversation/redux/selectors";
import {
  selectAvailableModels,
  selectModelOptions,
  fetchAvailableModels,
} from "@/lib/redux/slices/modelRegistrySlice";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import {
  selectActiveChatAgent,
  selectAgentDefaultSettings,
} from "@/lib/redux/slices/activeChatSlice";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { ResourceChips } from "@/features/prompts/components/resource-display";
import { ResourcePickerMenu } from "@/features/prompts/components/resource-picker/ResourcePickerMenu";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { ModelSettingsDialog } from "@/features/prompts/components/configuration/ModelSettingsDialog";
import { ChatDebugModal } from "../../admin/ChatDebugModal";
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
  const hasVariables = useAppSelector((state) =>
    selectHasVariables(state, sessionId),
  );
  const uiState = useAppSelector((state) => selectUIState(state, sessionId));
  const agentId = useAppSelector((state) => selectAgentId(state, sessionId));

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

  // ── Model registry ─────────────────────────────────────────────────────────
  const modelOptions = useAppSelector(selectModelOptions);
  const availableModels = useAppSelector(selectAvailableModels);

  const currentModelId = useAppSelector((state) =>
    selectEffectiveModelId(state, sessionId),
  );
  const currentModelName = useAppSelector((state) =>
    selectEffectiveModelLabel(state, sessionId),
  );

  // Ensure models are loaded when model picker or settings are shown
  useEffect(() => {
    if ((showModelPicker || showSettings) && availableModels.length === 0) {
      dispatch(fetchAvailableModels());
    }
  }, [showModelPicker, showSettings, availableModels.length, dispatch]);

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
  const handleTranscriptionComplete = useCallback(
    (text: string) => {
      if (!text) return;
      const newContent = content ? `${content} ${text}` : text;
      dispatch(
        chatConversationsActions.setCurrentInput({
          sessionId,
          input: newContent,
        }),
      );
    },
    [content, dispatch, sessionId],
  );

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
      if (isExecuting) return;

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

  // ── Model override ─────────────────────────────────────────────────────────
  const handleModelSelect = useCallback(
    (modelId: string) => {
      dispatch(
        chatConversationsActions.setModelOverride({
          sessionId,
          model: modelId,
        }),
      );
      setIsModelPickerOpen(false);
    },
    [dispatch, sessionId],
  );

  // ── Settings dialog ────────────────────────────────────────────────────────
  // Show the full effective settings (agent defaults + user overrides merged)
  const settingsForDialog = useAppSelector((state) =>
    selectEffectiveSettings(state, sessionId),
  );
  // Agent defaults — used to compute the diff on save (only store true overrides)
  const agentDefaultSettings = useAppSelector(selectAgentDefaultSettings);

  const handleSettingsChange = useCallback(
    (newSettings: PromptSettings) => {
      const { model_id, ...changedSettings } = newSettings;

      // Only store keys where the value genuinely differs from the agent default.
      // Sending the default value back as an "override" is a no-op at best and
      // an error at worst (server rejects redundant default overrides).
      const trueOverrides: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(changedSettings)) {
        const defaultVal = (agentDefaultSettings as Record<string, unknown>)[
          key
        ];
        if (JSON.stringify(value) !== JSON.stringify(defaultVal)) {
          trueOverrides[key] = value;
        }
      }

      dispatch(
        chatConversationsActions.updateUIState({
          sessionId,
          updates: {
            ...(model_id ? { modelOverride: model_id } : {}),
            modelSettings: trueOverrides,
          },
        }),
      );
    },
    [dispatch, sessionId, agentDefaultSettings],
  );

  const isDisabled = isExecuting || (!agentId && !onSubmitOverride);

  // The bordered input box — its shape changes based on mode:
  //   default  : rounded pill (welcome screen, big input)
  //   singleLine: flat top, joined to variables above
  //   seamless : no border (embedded layouts)
  const inputBoxClass = seamless
    ? "flex flex-col w-full bg-background"
    : singleLine
      ? "flex flex-col w-full bg-background border border-border rounded-b-2xl rounded-t-none border-t-0 py-1"
      : "flex flex-col w-full bg-background border border-border rounded-3xl py-2";

  return (
    // Outer wrapper: no border, no background — just stacks children vertically
    <div className="flex flex-col w-full">
      {/* ── Variables (above the bordered input box) ──────────────────── */}
      {hasVariables && useGuidedVars && (
        <GuidedVariableInputs
          sessionId={sessionId}
          disabled={isExecuting}
          seamless
        />
      )}
      {hasVariables && !useGuidedVars && (
        <div className="max-h-[30vh] md:max-h-[45vh] overflow-y-auto overscroll-contain rounded-xl mb-1">
          <StackedVariableInputs
            sessionId={sessionId}
            disabled={isExecuting}
            minimal
          />
        </div>
      )}

      {/* ── Bordered input box ────────────────────────────────────────── */}
      <div className={inputBoxClass}>
        {/* Admin global debug toolbar */}
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

        {/* Resource chips */}
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

        {/* Textarea row — + button, textarea, icons, send */}
        <div className="flex items-center">
          {showResourcePicker && (
            <Popover
              open={isResourcePickerOpen}
              onOpenChange={setIsResourcePickerOpen}
            >
              <PopoverTrigger asChild>
                {isUploading ? (
                  <TapTargetButtonTransparent
                    ariaLabel="Uploading..."
                    icon={
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    }
                  />
                ) : (
                  <PlusTapButton
                    variant="transparent"
                    ariaLabel="Add attachments"
                  />
                )}
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
                  onSettingsClick={
                    showSettings ? () => setIsSettingsOpen(true) : undefined
                  }
                  onDebugClick={
                    isAdmin ? () => setIsDebugModalOpen(true) : undefined
                  }
                  showDebugActive={showDebugInfo}
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
            placeholder={placeholder}
            disabled={isDisabled}
            className={[
              "flex-1 resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground/70",
              "focus:outline-none overflow-y-auto leading-[18px]",
              singleLine
                ? "py-[7px] min-h-[34px] max-h-[34px]"
                : "py-[9px] min-h-[36px] max-h-[200px]",
            ].join(" ")}
            rows={1}
          />

          <InputActionButtons
            showVoice={showVoice}
            onTranscriptionComplete={handleTranscriptionComplete}
            isExecuting={isExecuting}
            isDisabled={isDisabled}
            isUploading={isUploading}
            sendButtonVariant={sendButtonVariant}
            onSubmit={() => handleSubmit()}
          />
        </div>

        {/* Model picker */}
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

        {/* Submit hint */}
        {showShiftEnterHint && (
          <p className="text-[10px] text-muted-foreground/60 px-3">
            <kbd className="text-[9px]">⌘+Enter</kbd> to send,{" "}
            <kbd className="text-[9px]">Shift+Enter</kbd> for new line
          </p>
        )}

        {/* Submit-on-enter toggle */}
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

        {/* Settings dialog */}
        {showSettings && (
          <ModelSettingsDialog
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            modelId={currentModelId ?? ""}
            models={availableModels}
            settings={settingsForDialog}
            onSettingsChange={handleSettingsChange}
            showModelSelector
            onModelChange={handleModelSelect}
          />
        )}

        {/* Admin debug modal */}
        {isAdmin && (
          <ChatDebugModal
            sessionId={sessionId}
            isOpen={isDebugModalOpen}
            onClose={() => setIsDebugModalOpen(false)}
          />
        )}
      </div>

      {/* ── Footer row (outside the bordered box, below it) ───────────── */}
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
