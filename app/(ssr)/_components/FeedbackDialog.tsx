"use client";

// FeedbackDialog — Lightweight SSR-compatible feedback form.
// No Redux dependency. Calls the real submitFeedback server action directly.
// Lazy-loaded via next/dynamic — zero cost until user clicks "Submit Feedback".

import { useState, useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Send,
  Check,
  Bug,
  Lightbulb,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitFeedback } from "@/actions/feedback.actions";
import type { FeedbackType } from "@/types/feedback.types";

interface FeedbackDialogProps {
  onClose: () => void;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "feature", label: "Feature", icon: Lightbulb },
  { value: "suggestion", label: "Suggestion", icon: MessageSquare },
  { value: "other", label: "Other", icon: HelpCircle },
];

export default function FeedbackDialog({ onClose }: FeedbackDialogProps) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const result = await submitFeedback({
      feedback_type: feedbackType,
      route: pathname,
      description: description.trim(),
    });

    setIsSubmitting(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Failed to submit feedback");
    }
  }, [description, feedbackType, pathname, isSubmitting]);

  // Ctrl+Enter to submit
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (submitted) {
    return (
      <div
        ref={dialogRef}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm p-6 rounded-2xl shadow-2xl text-center bg-[var(--shell-glass-bg)] backdrop-blur-[24px] saturate-[1.5] border border-[var(--shell-glass-border)]">
          <div className="inline-flex items-center justify-center w-10 h-10 mb-3 rounded-full bg-green-500/10">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            Feedback Submitted
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Thank you! We&apos;ll review your feedback shortly.
          </p>
          <button
            className="px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors bg-[var(--shell-glass-bg-active)] hover:bg-[var(--shell-glass-bg-hover)] text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-[var(--shell-glass-bg)] backdrop-blur-[24px] saturate-[1.5] border border-[var(--shell-glass-border)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--shell-glass-border)]">
          <h3 className="text-sm font-semibold text-foreground">
            Submit Feedback
          </h3>
          <button
            className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer transition-colors text-muted-foreground hover:bg-[var(--shell-glass-bg-hover)] hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg cursor-pointer transition-colors border",
                  "[&_svg]:w-3.5 [&_svg]:h-3.5",
                  feedbackType === value
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400"
                    : "border-[var(--shell-glass-border)] text-muted-foreground hover:bg-[var(--shell-glass-bg-hover)] hover:text-foreground",
                )}
                onClick={() => setFeedbackType(value)}
                type="button"
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>

          {/* Route auto-captured */}
          <div className="text-[0.625rem] text-muted-foreground">
            Route: <span className="font-mono">{pathname}</span>
          </div>

          {/* Description */}
          <textarea
            ref={textareaRef}
            className="w-full h-28 px-3 py-2 text-xs leading-relaxed text-foreground bg-[var(--shell-glass-bg-active)] border border-[var(--shell-glass-border)] rounded-lg outline-none resize-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring notes-scrollable"
            placeholder="Describe the issue, feature, or suggestion..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />

          {error && (
            <p className="text-[0.625rem] text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--shell-glass-border)]">
          <span className="text-[0.625rem] text-muted-foreground">
            Ctrl+Enter to submit
          </span>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors",
              "[&_svg]:w-3.5 [&_svg]:h-3.5",
              description.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
          >
            <Send />
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
