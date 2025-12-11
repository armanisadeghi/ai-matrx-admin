"use client";
import React, { useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
  selectIsExecuting,
  selectIsLastMessageUser,
  selectCurrentInput,
} from '@/lib/redux/prompt-execution/selectors';
import { executeMessage } from '@/lib/redux/prompt-execution/thunks/executeMessageThunk';
import { CompactPromptInput } from './CompactPromptInput';

interface CompactPromptModalProps {
  /** Control modal visibility */
  isOpen: boolean;
  onClose: () => void;
  
  /**
   * The runId of the execution instance
   * Required for Redux integration
   */
  runId?: string;
  
  /** Optional callbacks */
  onSubmit?: () => void; // Called after successful submission
  
  /** CompactPromptInput props */
  placeholder?: string;
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
}

/**
 * CompactPromptModal - Modal wrapper for CompactPromptInput
 * 
 * Provides a complete modal dialog with:
 * - Header with title
 * - Compact prompt input with variables and resources
 * - Footer with Cancel and Submit buttons
 * - Redux-driven execution
 * 
 * Ideal for inline AI triggers from context menus, toolbars, etc.
 */
export function CompactPromptModal({
  isOpen,
  onClose,
  runId,
  onSubmit,
  placeholder,
  uploadBucket,
  uploadPath,
  enablePasteImages,
}: CompactPromptModalProps) {
  const dispatch = useAppDispatch();

  // Redux state
  const isExecuting = useAppSelector(state => runId ? selectIsExecuting(state, runId) : false);
  const isLastMessageUser = useAppSelector(state => runId ? selectIsLastMessageUser(state, runId) : false);
  const chatInput = useAppSelector(state => runId ? selectCurrentInput(state, runId) : '');

  // Determine if submit should be disabled
  const isSendDisabled = !runId || isExecuting || (!isLastMessageUser && !chatInput.trim());

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!runId || isSendDisabled) return;

    try {
      await dispatch(executeMessage({
        runId,
        userInput: chatInput,
      })).unwrap();

      // Call optional onSubmit callback
      onSubmit?.();
      
      // Close modal on successful submission
      // Note: You may want to keep it open to show results in some cases
      // onClose();
    } catch (error) {
      console.error('Failed to execute prompt:', error);
      // Toast error is handled by the thunk
    }
  }, [runId, chatInput, isSendDisabled, dispatch, onSubmit]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-2 gap-0 max-h-[80dvh] flex flex-col">
        {/* Scrollable content area - minimal padding */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <CompactPromptInput
            runId={runId}
            placeholder={placeholder}
            uploadBucket={uploadBucket}
            uploadPath={uploadPath}
            enablePasteImages={enablePasteImages}
            onSubmit={handleSubmit}
            isExecuting={isExecuting}
            isSendDisabled={isSendDisabled}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

