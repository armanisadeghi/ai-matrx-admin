"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw, ArrowUp, CornerDownLeft, Mic, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatText } from "@/utils/text/text-case-converter";
import { VariableInputComponent } from "../variable-inputs";
import { PromptInputButton } from "../PromptInputButton";
import { ResourceChips, type Resource, ResourcePreviewSheet } from "../resource-display";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { selectIsDebugMode, showResourceDebugIndicator } from '@/lib/redux/slices/adminDebugSlice';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useRecordAndTranscribe } from '@/features/audio';
import { TranscriptionLoader } from '@/features/audio';
import { toast } from 'sonner';
import {
  selectVariableDefinitions,
  selectCurrentInput,
  selectResources,
  selectExpandedVariable,
  selectIsExecuting,
  selectIsLastMessageUser,
  selectAttachmentCapabilities,
  selectShowVariables,
  selectUserVariables,
} from '@/lib/redux/prompt-execution/selectors';
import {
  setCurrentInput,
  updateVariable,
  removeResource,
  setExpandedVariable,
} from '@/lib/redux/prompt-execution/slice';
import { executeMessage } from '@/lib/redux/prompt-execution/thunks/executeMessageThunk';
import { selectPromptsPreferences } from '@/lib/redux/selectors/userPreferenceSelectors';
import { SmartResourcePickerButton } from './SmartResourcePickerButton';

interface SmartPromptInputProps {
  /** 
   * The runId of the execution instance
   * Component works without it but waits for it to become active
   */
  runId?: string;

  /** Optional UI customization props */
  placeholder?: string;
  sendButtonVariant?: 'gray' | 'blue' | 'default';
  showShiftEnterHint?: boolean;

  /** Optional display control */
  showSubmitOnEnterToggle?: boolean; // Controls visibility of submit on enter toggle

  /** Upload configuration (with defaults) */
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
}

/**
 * SmartPromptInput - Redux-driven prompt input component
 * 
 * Fully self-reliant component that:
 * - Gets all data from Redux using runId
 * - Dispatches actions directly (no callbacks)
 * - Prevents re-renders with fine-grained selectors
 * - Handles undefined runId gracefully
 * 
 * Parent components just pass runId and minimal UI props.
 */
export function SmartPromptInput({
  runId,
  placeholder,
  sendButtonVariant = 'gray',
  showShiftEnterHint = false,
  showSubmitOnEnterToggle = true,
  uploadBucket = "userContent",
  uploadPath = "prompt-attachments",
  enablePasteImages = true,
}: SmartPromptInputProps) {
  if (sendButtonVariant === 'default') sendButtonVariant = 'gray';

  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceSubmitRef = useRef(false);

  // ========== LOCAL STATE (UI-only) ==========
  const [previewResource, setPreviewResource] = useState<{ resource: Resource; index: number } | null>(null);
  const [submitOnEnter, setSubmitOnEnter] = useState(true); // Local state for now, could come from user prefs

  // ========== REDUX STATE (Conditional on runId) ==========
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const userPreferences = useAppSelector(selectPromptsPreferences);
  
  // Use user preference for submitOnEnter
  useEffect(() => {
    setSubmitOnEnter(userPreferences.submitOnEnter);
  }, [userPreferences.submitOnEnter]);

  // Instance-specific selectors (return stable defaults if runId undefined)
  const variableDefaults = useAppSelector(state => runId ? selectVariableDefinitions(state, runId) : []);
  const chatInput = useAppSelector(state => runId ? selectCurrentInput(state, runId) : '');
  const resources = useAppSelector(state => runId ? selectResources(state, runId) : []);
  const expandedVariable = useAppSelector(state => runId ? selectExpandedVariable(state, runId) : null);
  const isTestingPrompt = useAppSelector(state => runId ? selectIsExecuting(state, runId) : false);
  const isLastMessageUser = useAppSelector(state => runId ? selectIsLastMessageUser(state, runId) : false);

  const showVariablesFromRedux = useAppSelector(state => runId ? selectShowVariables(state, runId) : false);
  const variableValues = useAppSelector(state => runId ? selectUserVariables(state, runId) : {});

  // Show resource debug indicator when debug mode is on and resources exist
  useEffect(() => {
    if (isDebugMode && resources.length > 0 && runId) {
      dispatch(showResourceDebugIndicator({ 
        resources, 
        chatInput, 
        variableDefaults 
      }));
    }
  }, [isDebugMode, resources, chatInput, variableDefaults, dispatch, runId]);

  // File upload hook for paste support
  const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(uploadBucket, uploadPath);

  // Voice transcription hook
  const {
    isRecording,
    isTranscribing,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
  } = useRecordAndTranscribe({
    onTranscriptionComplete: (result) => {
      if (result.success && result.text && runId) {
        // Append transcribed text to existing input
        const newText = chatInput ? `${chatInput}\n${result.text}` : result.text;

        // Set flag to submit after state update
        pendingVoiceSubmitRef.current = true;

        // Update the input value in Redux
        dispatch(setCurrentInput({ runId, input: newText }));
      }
    },
    onError: (error) => {
      toast.error('Transcription failed', {
        description: error,
      });
    },
    autoTranscribe: true,
  });

  // Effect to handle pending voice submission after state update
  useEffect(() => {
    if (pendingVoiceSubmitRef.current && chatInput.trim() && runId) {
      pendingVoiceSubmitRef.current = false;

      // Small delay to ensure Redux state is updated
      setTimeout(() => {
        handleSendMessage();
      }, 50);
    }
  }, [chatInput, runId]);

  // Handle mic button click
  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else if (!isTranscribing) {
      startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  // Handle resource removal
  const handleRemoveResource = useCallback((index: number) => {
    if (runId) {
      dispatch(removeResource({ runId, index }));
    }
  }, [runId, dispatch]);

  // Handle resource preview
  const handlePreviewResource = useCallback((resource: Resource, index: number) => {
    setPreviewResource({ resource, index });
  }, []);

  // Handle pasted images
  const handlePasteImage = useCallback(async (file: File) => {
    if (!runId) return;
    
    try {
      const results = await uploadMultipleToPrivateUserAssets([file]);
      if (results && results.length > 0) {
        // Use the upload thunk instead
        const { uploadAndAddFileResource } = await import('@/lib/redux/prompt-execution/thunks/resourceThunks');
        await dispatch(uploadAndAddFileResource({
          runId,
          file,
          bucket: uploadBucket,
          path: uploadPath,
          uploadFn: uploadMultipleToPrivateUserAssets,
        }));
      }
    } catch (error) {
      console.error("Failed to upload pasted image:", error);
    }
  }, [runId, dispatch, uploadBucket, uploadPath, uploadMultipleToPrivateUserAssets]);

  // Setup clipboard paste
  useClipboardPaste({
    textareaRef,
    onPasteImage: handlePasteImage,
    disabled: !enablePasteImages || !runId
  });

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, but respect max-height
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [chatInput]);

  // Check if all variables already have values (for visible vars mode with pre-filled values)
  const allVariablesHaveValues = variableDefaults.every(v => {
    const value = variableValues[v.name];
    return value && value.trim() !== '';
  });

  // Determine if the send button should be disabled
  const isSendDisabled = !runId || isTestingPrompt || (!isLastMessageUser && !chatInput.trim());

  // Handle chat input change
  const handleChatInputChange = useCallback((value: string) => {
    if (runId) {
      dispatch(setCurrentInput({ runId, input: value }));
    }
  }, [runId, dispatch]);

  // Handle variable value change
  const handleVariableValueChange = useCallback((variableName: string, value: string) => {
    if (runId) {
      dispatch(updateVariable({ runId, variableName, value }));
    }
  }, [runId, dispatch]);

  // Handle expanded variable change
  const handleExpandedVariableChange = useCallback((variable: string | null) => {
    if (runId) {
      dispatch(setExpandedVariable({ runId, variableName: variable }));
    }
  }, [runId, dispatch]);

  // Handle send message
  const handleSendMessage = useCallback(() => {
    if (!runId || isSendDisabled) return;

    dispatch(executeMessage({ 
      runId,
      userInput: chatInput,
    }));
  }, [runId, chatInput, isSendDisabled, dispatch]);

  // Handle keyboard events in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
      e.preventDefault();
      if (!isSendDisabled) {
        handleSendMessage();
      }
    }
  };

  // Determine placeholder text
  const placeholderText = placeholder || (showVariablesFromRedux
    ? "Add a message to the bottom of prompt..."
    : "Type your message...");

  // Send button classes based on variant
  const sendButtonClasses = sendButtonVariant === 'blue'
    ? "h-7 w-7 p-0 flex-shrink-0 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-600 text-white"
    : "h-7 w-7 p-0 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600";

  // If no runId, show loading state or minimal UI
  if (!runId) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
        <div className="px-2 pt-1.5">
          <textarea
            disabled
            placeholder="Initializing..."
            className="w-full bg-transparent border-none outline-none text-base text-gray-400 dark:text-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
            style={{ minHeight: '40px', maxHeight: '200px', fontSize: '16px' }}
            rows={1}
          />
        </div>
        <div className="flex items-center justify-between px-2 pb-1.5">
          <div className="flex items-center gap-1" />
          <Button disabled className={sendButtonClasses}>
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
      {/* Variable Inputs - Only shown when showVariables is true */}
      {showVariablesFromRedux && variableDefaults.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-800">
          <div className="p-0">
            <div className="space-y-0">
              {variableDefaults.map((variable, index) => {
                const isExpanded = expandedVariable === variable.name;
                const value = variableValues[variable.name] || variable.defaultValue || '';

                return (
                  <div key={variable.name}>
                    {isExpanded ? (
                      <Popover
                        open={expandedVariable === variable.name}
                        onOpenChange={(open) => {
                          if (!open) {
                            handleExpandedVariableChange(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <div
                            className="w-full flex items-center gap-2 px-3 h-10 bg-gray-50 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors group"
                            onClick={() => handleExpandedVariableChange(variable.name)}
                            tabIndex={index + 1}
                          >
                            <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer">
                              {formatText(variable.name)}
                            </Label>
                            <div className="flex-1 text-sm text-gray-900 dark:text-gray-200 min-w-0">
                              {value ? (
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis block">
                                  {value.replace(/\n/g, " ↵ ")}
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-600">
                                  Enter value...
                                </span>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0 transition-colors" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[500px] max-h-[500px] p-2 border-gray-300 dark:border-gray-700 overflow-y-auto scrollbar-thin"
                          align="center"
                          side="top"
                          sideOffset={8}
                        >
                          <VariableInputComponent
                            value={value}
                            onChange={(newValue) => handleVariableValueChange(variable.name, newValue)}
                            variableName={variable.name}
                            customComponent={variable.customComponent}
                            onRequestClose={() => handleExpandedVariableChange(null)}
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="flex items-center gap-2 px-3 h-10 bg-gray-50 dark:bg-zinc-800 border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:dark:bg-zinc-700 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20 group">
                        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0 cursor-pointer">
                          {formatText(variable.name)}
                        </Label>
                        <input
                          type="text"
                          value={value.includes('\n') ? value.replace(/\n/g, " ↵ ") : value}
                          onChange={(e) => handleVariableValueChange(variable.name, e.target.value)}
                          placeholder="Enter value..."
                          className="flex-1 text-base bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 min-w-0"
                          style={{ fontSize: '16px' }}
                          tabIndex={index + 1}
                        />
                        <button
                          type="button"
                          onClick={() => handleExpandedVariableChange(variable.name)}
                          className="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          tabIndex={-1}
                          title="Expand to full editor"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Resource Chips Display */}
      {resources.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-800 py-1">
          <ResourceChips
            resources={resources}
            onRemove={handleRemoveResource}
            onPreview={handlePreviewResource}
          />
        </div>
      )}

      {/* Text Area */}
      <div className="px-2 pt-1.5">
        <textarea
          ref={textareaRef}
          value={chatInput}
          onChange={(e) => handleChatInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full bg-transparent border-none outline-none text-base text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ minHeight: '40px', maxHeight: '200px', fontSize: '16px' }}
          tabIndex={variableDefaults.length + 1}
          rows={1}
          autoFocus={!showVariablesFromRedux || variableDefaults.length === 0 || allVariablesHaveValues}
        />
      </div>

      {/* Bottom Controls - All buttons in one row */}
      <div className="flex items-center justify-between px-2 pb-1.5">
        <div className="flex items-center gap-1">
          {/* Voice Input - Show transcription loader when processing */}
          {isTranscribing ? (
            <div className="px-2">
              <TranscriptionLoader message="Transcribing" duration={duration} size="sm" />
            </div>
          ) : isRecording ? (
            <div className="flex items-center gap-1 px-1">
              {/* Audio level indicator - pulsing dot that grows with audio */}
              <div className="relative flex items-center justify-center w-5 h-5">
                <div
                  className="absolute rounded-full bg-blue-500 dark:bg-blue-400 transition-transform duration-75"
                  style={{
                    width: '8px',
                    height: '8px',
                    transform: `scale(${1 + (audioLevel / 150)})`,
                  }}
                />
                <div className="absolute w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-ping" />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={stopRecording}
                className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Mic className="h-3.5 w-3.5" />
                <span className="text-xs">Stop ({Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')})</span>
              </Button>
            </div>
          ) : (
            <PromptInputButton
              icon={Mic}
              tooltip="Record voice message"
              onClick={handleMicClick}
              active={false}
            />
          )}

          {/* Resource Picker */}
          <SmartResourcePickerButton
            runId={runId}
            uploadBucket={uploadBucket}
            uploadPath={uploadPath}
          />

          {/* Shift+Enter hint text (alternative to buttons) */}
          {showShiftEnterHint && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {submitOnEnter ? "Shift+Enter for new line" : "Enter for new line"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Submit on Enter toggle - Only shown if showSubmitOnEnterToggle is true */}
          {showSubmitOnEnterToggle && (
            <PromptInputButton
              icon={CornerDownLeft}
              tooltip={submitOnEnter ? "Submit on Enter (Click to disable)" : "New line on Enter (Click to enable Submit on Enter)"}
              onClick={() => setSubmitOnEnter(!submitOnEnter)}
              active={submitOnEnter}
            />
          )}

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={isSendDisabled}
            className={sendButtonClasses}
            tabIndex={-1}
          >
            {isTestingPrompt ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Resource Preview Sheet */}
      {previewResource && (
        <ResourcePreviewSheet
          isOpen={!!previewResource}
          onClose={() => setPreviewResource(null)}
          resource={previewResource.resource}
        />
      )}
    </div>
  );
}

