"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  isSending = false,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Handle input change with typing indicator
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);

      // Typing indicator
      if (onTyping) {
        onTyping(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing after 3 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 3000);
      }
    },
    [onTyping]
  );

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending || disabled) return;

    // Clear typing indicator
    if (onTyping) {
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Clear input immediately for better UX
    setContent("");

    try {
      await onSendMessage(trimmedContent);
    } catch (error) {
      // Restore content if send failed
      setContent(trimmedContent);
    }

    // Focus back on textarea
    textareaRef.current?.focus();
  }, [content, isSending, disabled, onSendMessage, onTyping]);

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const canSend = content.trim().length > 0 && !isSending && !disabled;

  return (
    <div
      className={cn(
        "flex items-end gap-2 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50",
        className
      )}
    >
      {/* Text Input */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            "min-h-[40px] max-h-[120px] resize-none py-2.5 px-3",
            "text-base", // 16px to prevent iOS zoom
            "rounded-2xl",
            "border-zinc-200 dark:border-zinc-700",
            "focus-visible:ring-1 focus-visible:ring-primary",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>

      {/* Send Button */}
      <Button
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full shrink-0 transition-all",
          canSend
            ? "bg-primary hover:bg-primary/90"
            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 cursor-not-allowed"
        )}
        onClick={handleSend}
        disabled={!canSend}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default MessageInput;
