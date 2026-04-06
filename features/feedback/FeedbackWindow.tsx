"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bug,
  Camera,
  Check,
  Clipboard,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/slices/userSlice";
import { closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/components/official-candidate/floating-window-panel/WindowPanel";
import { submitFeedback, getUserFeedback } from "@/actions/feedback.actions";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import {
  FileUploadWithStorage,
  type UploadedFileResult,
} from "@/components/ui/file-upload/FileUploadWithStorage";
import type { FeedbackType } from "@/types/feedback.types";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackStats {
  total: number;
  pending: number;
  resolved: number;
}

const FEEDBACK_TYPES: {
  value: FeedbackType;
  label: string;
  icon: typeof Bug;
}[] = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "feature", label: "Feature", icon: Lightbulb },
  { value: "suggestion", label: "Suggestion", icon: MessageSquare },
  { value: "other", label: "Other", icon: HelpCircle },
];

// ─── FeedbackWindow ───────────────────────────────────────────────────────────

export interface FeedbackWindowProps extends Omit<
  WindowPanelProps,
  "children" | "title" | "actionsLeft" | "actionsRight"
> {
  title?: string;
}

export function FeedbackWindow({
  title = "Submit Feedback",
  id = "feedback-window",
  ...windowProps
}: FeedbackWindowProps) {
  const dispatch = useAppDispatch();

  const onClose = useCallback(() => {
    dispatch(closeOverlay({ overlayId: "feedbackDialog" }));
  }, [dispatch]);

  return (
    <WindowPanel
      id={id}
      title={title}
      onClose={onClose}
      minWidth={380}
      minHeight={320}
      initialRect={{ width: 480, height: 580 }}
      urlSyncKey="feedback"
      urlSyncId="default"
      className="feedback-window-panel"
      {...windowProps}
    >
      <FeedbackWindowBody onClose={onClose} />
    </WindowPanel>
  );
}

// ─── FeedbackWindowBody ───────────────────────────────────────────────────────

function FeedbackWindowBody({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const reduxUser = useAppSelector(selectUser);

  const username =
    reduxUser?.userMetadata?.name ||
    reduxUser?.email?.split("@")[0] ||
    "Anonymous";

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ── Image upload ─────────────────────────────────────────────────────────
  const { uploadToPublicUserAssets } = useFileUploadWithStorage(
    "user-public-assets",
    "feedback-images",
  );

  const uploadPastedImage = useCallback(
    async (file: File) => {
      setIsPasting(true);
      try {
        const result = await uploadToPublicUserAssets(file);
        if (result?.url) {
          setUploadedImages((prev) => [...prev, result.url]);
          toast.success("Image pasted and uploaded");
        }
      } catch {
        toast.error("Failed to upload pasted image");
      } finally {
        setIsPasting(false);
      }
    },
    [uploadToPublicUserAssets],
  );

  // Ctrl+V paste handler
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            const named = new File([file], `pasted-${Date.now()}.${ext}`, {
              type: file.type,
            });
            await uploadPastedImage(named);
          }
          break;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [uploadPastedImage]);

  const handleUploadComplete = useCallback((results: UploadedFileResult[]) => {
    setUploadedImages((prev) => [...prev, ...results.map((r) => r.url)]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePasteButton = useCallback(async () => {
    try {
      if (!navigator.clipboard?.read) {
        toast.info("Use Ctrl+V to paste clipboard images");
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split("/")[1] || "png";
          const file = new File([blob], `pasted-${Date.now()}.${ext}`, {
            type: imageType,
          });
          await uploadPastedImage(file);
          return;
        }
      }
      toast.info("No image found in clipboard");
    } catch {
      toast.info("Copy an image first, then click Paste or press Ctrl+V");
    }
  }, [uploadPastedImage]);

  const handleScreenshot = useCallback(async () => {
    setIsCapturing(true);

    // Hide the feedback panel so it doesn't appear in the capture
    const feedbackEls = Array.from(
      document.querySelectorAll<HTMLElement>(".feedback-window-panel"),
    );
    const prevVisibility = feedbackEls.map((el) => el.style.visibility);
    feedbackEls.forEach((el) => {
      el.style.visibility = "hidden";
    });

    try {
      // Use the Screen Capture API — works perfectly with all CSS including
      // backdrop-filter, CSS variables, and complex layouts.
      // html2canvas v1.x fails silently on modern CSS.
      if (!navigator.mediaDevices?.getDisplayMedia) {
        toast.error("Screen capture is not supported in this browser");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });

      // Wait one frame for the browser to actually hide the panel before grabbing
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();
      stream.getTracks().forEach((t) => t.stop());

      // Draw the frame to a canvas and export as PNG
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);

      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("canvas.toBlob failed"))),
          "image/png",
        );
      });

      const file = new File([blob], `screenshot-${Date.now()}.png`, {
        type: "image/png",
      });
      const result = await uploadToPublicUserAssets(file);
      if (result?.url) {
        setUploadedImages((prev) => [...prev, result.url]);
        toast.success("Screenshot captured!");
      } else {
        toast.error("Screenshot captured but upload failed");
      }
    } catch (err) {
      // User cancelled the screen picker — don't show an error
      const name = err instanceof Error ? err.name : "";
      if (name !== "NotAllowedError" && name !== "AbortError") {
        toast.error("Failed to capture screenshot");
      }
    } finally {
      feedbackEls.forEach((el, i) => {
        el.style.visibility = prevVisibility[i];
      });
      setIsCapturing(false);
    }
  }, [uploadToPublicUserAssets]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const result = await submitFeedback({
      feedback_type: feedbackType,
      route: pathname,
      description: description.trim(),
      image_urls: uploadedImages.length > 0 ? uploadedImages : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      setDescription("");
      setUploadedImages([]);
      // Fetch stats (non-blocking)
      getUserFeedback()
        .then((res) => {
          if (res.success && res.data) {
            const items = res.data;
            const pending = items.filter((i) =>
              ["new", "in_progress"].includes(i.status),
            ).length;
            const resolved = items.filter((i) =>
              ["resolved", "closed"].includes(i.status),
            ).length;
            setStats({ total: items.length, pending, resolved });
          }
        })
        .catch(() => {});
    } else {
      setError(result.error ?? "Failed to submit feedback");
    }
  }, [description, feedbackType, pathname, isSubmitting, uploadedImages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleReset = useCallback(() => {
    setSubmitted(false);
    setStats(null);
    setFeedbackType("bug");
    setDescription("");
    setUploadedImages([]);
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // ── Submitted state ───────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-5">
        {/* Success icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 ring-4 ring-green-500/20">
          <Check className="w-7 h-7 text-green-500" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            Feedback Submitted!
          </h3>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Thank you — we&apos;ll review your report and get on it.
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-6 rounded-xl border border-border bg-muted/30 px-6 py-3">
            <StatPill label="Submitted" value={stats.total} />
            <div className="w-px h-8 bg-border" />
            <StatPill
              label="Pending"
              value={stats.pending}
              valueClassName="text-amber-500"
            />
            <div className="w-px h-8 bg-border" />
            <StatPill
              label="Resolved"
              value={stats.resolved}
              valueClassName="text-green-500"
            />
          </div>
        )}

        {/* Action tiles */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[340px]">
          <ActionTile
            icon={<Plus className="w-4 h-4" />}
            label="Submit Another"
            onClick={handleReset}
          />
          <Link
            href="/settings/feedback"
            onClick={onClose}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-3 text-center cursor-pointer group"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
              View All
            </span>
          </Link>
          <ActionTile
            icon={<X className="w-4 h-4" />}
            label="Close"
            onClick={onClose}
          />
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable body */}
      <div className="flex-1 overflow-auto min-h-0 px-4 py-3 space-y-3">
        {/* Type selector */}
        <div className="flex gap-1.5 flex-wrap">
          {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg cursor-pointer transition-colors border",
                "[&_svg]:w-3.5 [&_svg]:h-3.5",
                feedbackType === value
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              onClick={() => setFeedbackType(value)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>

        {/* Route + User info */}
        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground font-mono">
          <span>
            Route: <span className="text-foreground/70">{pathname}</span>
          </span>
          <span>
            User: <span className="text-foreground/70">{username}</span>
          </span>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <textarea
            ref={textareaRef}
            className="w-full h-28 px-3 py-2 text-xs leading-relaxed text-foreground bg-muted/40 border border-border rounded-lg outline-none resize-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:bg-background"
            style={{ fontSize: "16px" }}
            placeholder="Describe the issue, feature request, or suggestion..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <p className="text-[10px] text-muted-foreground">
            Ctrl+Enter to submit · Ctrl+V to paste screenshots
          </p>
        </div>

        {/* Screenshots */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Screenshots{" "}
            <span className="font-normal opacity-60">(optional)</span>
          </p>

          <FileUploadWithStorage
            bucket="userContent"
            path="feedback-images"
            saveTo="public"
            onUploadComplete={handleUploadComplete}
            multiple
            useMiniUploader
            maxHeight="120px"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteButton}
              disabled={isSubmitting || isPasting}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            >
              <Clipboard className="w-3 h-3" />
              {isPasting ? "Pasting..." : "Paste Image"}
            </button>
            <button
              type="button"
              onClick={handleScreenshot}
              disabled={isSubmitting || isCapturing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            >
              <Camera className="w-3 h-3" />
              {isCapturing ? "Capturing..." : "Screenshot"}
            </button>
          </div>

          {/* Image thumbnails */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {uploadedImages.map((url, i) => (
                <div
                  key={`img-${i}`}
                  className="relative group w-14 h-14 rounded-md overflow-hidden border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Attachment ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </div>

      {/* Sticky footer */}
      <div
        data-feedback-overlay
        className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20"
      >
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
            "[&_svg]:w-3.5 [&_svg]:h-3.5",
            description.trim() && !isSubmitting
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
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "text-xl font-bold tabular-nums",
          valueClassName ?? "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors p-3 text-center cursor-pointer group"
    >
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
      </span>
      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
        {label}
      </span>
    </button>
  );
}
