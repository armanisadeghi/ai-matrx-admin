"use client";

/**
 * AgentTextarea
 *
 * The composing surface for agent input — textarea, auto-resize, expand toggle,
 * clipboard paste, and undo/redo keyboard shortcuts.
 *
 * Voice input is NOT handled here. The microphone button lives in the action
 * bar beside this textarea and writes transcripts into the same
 * `userInputText` Redux slice that this component reads — there's no voice
 * state plumbed through this component or its parents.
 *
 * Only requires conversationId. Everything else comes from Redux or config
 * props.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "sonner";
import {
  selectUserInputText,
  selectInputCharCount,
} from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import { setUserInputText } from "@/features/agents/redux/execution-system/instance-user-input/instance-user-input.slice";
import { selectSubmitOnEnter } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { selectIsExecuting } from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import {
  addResource,
  setResourcePreview,
} from "@/features/agents/redux/execution-system/instance-resources/instance-resources.slice";
import { useInstanceInputUndoRedo } from "@/features/agents/hooks/useInstanceInputUndoRedo";
import {
  smartExecute,
  cancelExecution,
} from "@/features/agents/redux/execution-system/thunks/smart-execute.thunk";

// ── Props ────────────────────────────────────────────────────────────────────

interface AgentTextareaProps {
  conversationId: string;
  placeholder?: string;
  compact?: boolean;
  /** Render as a single-line input-like textarea (no expand toggle, minimal height) */
  singleRow?: boolean;
  uploadBucket?: string;
  uploadPath?: string;
  enablePasteImages?: boolean;
  surfaceKey?: string;
  disableSend?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AgentTextarea({
  conversationId,
  placeholder,
  compact = false,
  singleRow = false,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  enablePasteImages = true,
  surfaceKey,
  disableSend = false,
}: AgentTextareaProps) {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);

  // Redux — primitive selectors, no object churn
  const inputText = useAppSelector(selectUserInputText(conversationId));
  const charCount = useAppSelector(selectInputCharCount(conversationId));
  const submitOnEnter = useAppSelector(selectSubmitOnEnter(conversationId));
  const isExecuting = useAppSelector(selectIsExecuting(conversationId));

  // Variable values for undo snapshot co-capture
  const currentUserValues = useAppSelector(
    (state) =>
      state.instanceVariableValues.byConversationId[conversationId]
        ?.userValues ?? {},
  );

  // Undo/redo — intercepts Cmd+Z / Ctrl+Z
  useInstanceInputUndoRedo({ conversationId });

  // Expand icon: show whenever expanded OR text is long enough to need it (hidden in singleRow)
  const showExpand = !singleRow && (isExpanded || charCount > 80);

  // ── File upload ─────────────────────────────────────────────────────────────
  const { uploadMultipleToPrivateUserAssets } = useFileUploadWithStorage(
    uploadBucket,
    uploadPath,
  );

  const handleSend = useCallback(() => {
    if (disableSend) return;
    if (isExecuting) {
      dispatch(cancelExecution(conversationId));
    } else {
      dispatch(smartExecute({ conversationId, surfaceKey }));
    }
  }, [disableSend, isExecuting, conversationId, surfaceKey, dispatch]);

  // ── Paste image ─────────────────────────────────────────────────────────────
  const handlePasteImage = useCallback(
    async (file: File) => {
      try {
        const results = await uploadMultipleToPrivateUserAssets([file]);
        if (results && results.length > 0) {
          const url = (results[0] as { url?: string })?.url;
          if (!url) return;
          const resourceId = `res_${Date.now()}_paste`;
          dispatch(
            addResource({
              conversationId,
              blockType: "image",
              source: { url },
              resourceId,
            }),
          );
          dispatch(
            setResourcePreview({
              conversationId,
              resourceId,
              preview: file.name,
            }),
          );
        }
      } catch {
        toast.error("Failed to upload pasted image");
      }
    },
    [conversationId, dispatch, uploadMultipleToPrivateUserAssets],
  );

  useClipboardPaste({
    textareaRef,
    onPasteImage: handlePasteImage,
    disabled: !enablePasteImages,
  });

  // ── Text change ─────────────────────────────────────────────────────────────
  const handleTextChange = useCallback(
    (value: string) => {
      dispatch(
        setUserInputText({
          conversationId,
          text: value,
          userValues: currentUserValues,
        }),
      );
    },
    [conversationId, currentUserValues, dispatch],
  );

  // ── Key down ────────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
        e.preventDefault();
        if (!disableSend && !isExecuting) handleSend();
      }
    },
    [submitOnEnter, disableSend, isExecuting, handleSend],
  );

  // ── Auto-resize ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    // Single-row: stays at one line, scrolls horizontally-ish via overflow
    if (singleRow) {
      el.style.height = "20px";
      wrapper.style.height = "20px";
      return;
    }

    if (isExpanded) {
      const target = Math.max(Math.floor(window.innerHeight * 0.6) - 80, 200);
      el.style.height = `${target}px`;
      wrapper.style.transition = "none";
      wrapper.style.height = `${wrapper.offsetHeight}px`;
      requestAnimationFrame(() => {
        wrapper.style.transition = "height 300ms cubic-bezier(0.4, 0, 0.2, 1)";
        wrapper.style.height = `${target}px`;
      });
    } else {
      const minH = compact ? 20 : 40;
      const startHeight = wrapper.offsetHeight;
      el.style.height = "auto";
      const natural = Math.max(minH, Math.min(el.scrollHeight, 200));
      wrapper.style.transition = "none";
      wrapper.style.height = `${startHeight}px`;
      requestAnimationFrame(() => {
        wrapper.style.transition = "height 300ms cubic-bezier(0.4, 0, 0.2, 1)";
        wrapper.style.height = `${natural}px`;
        setTimeout(() => {
          el.style.height = `${natural}px`;
        }, 300);
      });
    }
  }, [charCount, isExpanded, singleRow]);

  // ── Auto-focus ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [conversationId]);

  const placeholderText =
    placeholder ?? (isExpanded ? "Add a message..." : "Type your message...");

  if (singleRow) {
    return (
      <div ref={wrapperRef} className="relative flex items-center min-w-0">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/60 resize-none overflow-hidden leading-5"
          style={{ minHeight: 20, maxHeight: 20 }}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div className="px-2 pt-1.5 relative shrink-0">
      <div ref={wrapperRef} className="relative">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full bg-transparent border-none outline-none text-base md:text-xs text-foreground placeholder:text-muted-foreground/60 resize-none overflow-y-auto scrollbar-hide"
          style={{ minHeight: compact ? 20 : 40 }}
          rows={1}
        />
        {showExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="absolute top-0 right-0 p-1 rounded hover:bg-muted/80 opacity-50 hover:opacity-100 transition-all"
            title={isExpanded ? "Collapse input" : "Expand input"}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
