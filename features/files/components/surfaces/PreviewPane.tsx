/**
 * features/files/components/surfaces/PreviewPane.tsx
 *
 * Side-panel preview for a single file. Lives to the RIGHT of the file list
 * inside PageShell — never replaces the list, so the user always has a way
 * back. Header bar exposes copy-link, download, "Open full view" (routes to
 * `/cloud-files/f/{fileId}`), and a Close (X) action that clears the active
 * file selection so the panel collapses.
 *
 * Why this exists separately from FilePreview:
 *   - FilePreview only renders the file's body (image, video, PDF, etc.).
 *   - This wrapper owns the header bar, navigation actions, and the escape
 *     hatch the user needs when triaging files quickly.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  History,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { selectFileById } from "@/features/files/redux/selectors";
import { setActiveFileId } from "@/features/files/redux/slice";
import { useFileActions } from "@/features/files/components/core/FileActions/useFileActions";
import { FilePreview } from "@/features/files/components/core/FilePreview/FilePreview";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import { FileVersionsList } from "@/features/files/components/core/FileVersions/FileVersionsList";
import { FileContextMenu } from "@/features/files/components/core/FileContextMenu/FileContextMenu";
import { FileRightClickMenu } from "@/features/files/components/core/FileContextMenu/FileRightClickMenu";
import { MoreHorizontal } from "lucide-react";
import { PreviewErrorBoundary } from "./PreviewErrorBoundary";
import { FileInfoTab } from "./FileInfoTab";

type PreviewTab = "preview" | "versions" | "info";

export interface PreviewPaneProps {
  fileId: string;
  /**
   * Called when the user clicks the close (X) button. Defaults to dispatching
   * `setActiveFileId(null)`. Override only if you have a specific surface
   * that needs to e.g. also navigate back.
   */
  onClose?: () => void;
  /**
   * Called when the user clicks "Open full view". Defaults to routing to
   * `/cloud-files/f/{fileId}`.
   */
  onOpen?: () => void;
  className?: string;
}

export function PreviewPane({
  fileId,
  onClose,
  onOpen,
  className,
}: PreviewPaneProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const actions = useFileActions(fileId);

  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>("preview");

  // Reset to the Preview tab whenever the user picks a different file —
  // each file id gets its own remount of <PreviewPane/> via the parent's
  // conditional render, so this state is naturally scoped.
  useEffect(() => {
    setActiveTab("preview");
  }, [fileId]);

  // Listen for "open versions tab" hints from the FileContextMenu so the
  // "Show versions" item can pop the user straight to the right tab. We
  // use a CustomEvent instead of a Redux state so the hint is transient
  // — once handled it's gone, no need to clear a flag.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ fileId?: string; tab?: PreviewTab }>)
        .detail;
      if (!detail || detail.fileId !== fileId) return;
      if (
        detail.tab === "versions" ||
        detail.tab === "preview" ||
        detail.tab === "info"
      ) {
        setActiveTab(detail.tab);
      }
    };
    window.addEventListener("cloud-files:open-preview-tab", handler);
    return () =>
      window.removeEventListener("cloud-files:open-preview-tab", handler);
  }, [fileId]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    // Always clear the active selection so the panel unmounts.
    dispatch(setActiveFileId(null));
    // If we're on a `/cloud-files/f/{fileId}` URL, the route hydrates
    // `initialFileId` on every mount — clearing state alone isn't enough,
    // because reload or any soft navigation back here would re-open the
    // panel. Pop the user back to `/cloud-files` so the URL also resets.
    if (pathname?.startsWith("/cloud-files/f/")) {
      router.push("/cloud-files");
    }
  }, [dispatch, onClose, pathname, router]);

  const handleOpen = useCallback(() => {
    if (onOpen) {
      onOpen();
      return;
    }
    router.push(`/cloud-files/f/${fileId}`);
  }, [fileId, onOpen, router]);

  // Esc closes the preview — matches Dropbox / Drive muscle memory and is the
  // last-line escape hatch if the user can't see the close button for any
  // reason (covered by an error UI, off-screen, etc.).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't steal Esc from open inputs / context menus / dialogs.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (t?.isContentEditable) return;
      handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await actions.download();
    } finally {
      setDownloading(false);
    }
  }, [actions, downloading]);

  const handleCopyLink = useCallback(async () => {
    if (copying) return;
    setCopying(true);
    try {
      const url = await actions.copyShareUrl();
      if (url) {
        setCopied(true);
        // Reset the icon back to a clipboard after a short tick.
        window.setTimeout(() => setCopied(false), 1600);
      }
    } finally {
      setCopying(false);
    }
  }, [actions, copying]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card",
        className,
      )}
      role="complementary"
      aria-label="File preview"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2 py-2 shrink-0">
        {/* Close — leftmost so it's never obscured by the app's user avatar
         * in the top-right corner. Esc keyboard shortcut also works. */}
        <button
          type="button"
          onClick={handleClose}
          title="Close preview (Esc)"
          aria-label="Close preview"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Right-click anywhere on the filename / icon area opens the
         * full file context menu — same items as the 3-dot dropdown to
         * the right. Wrapping in <FileRightClickMenu> doesn't intercept
         * left-click, so single-click still selects text inside the
         * label as before. */}
        <FileRightClickMenu fileId={fileId}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {file ? (
              <FileIcon
                fileName={file.fileName}
                size={16}
                className="shrink-0"
              />
            ) : null}
            <p
              className="truncate text-sm font-medium"
              title={file?.fileName ?? ""}
            >
              {file?.fileName ?? "Loading…"}
            </p>
          </div>
        </FileRightClickMenu>

        {/* Action buttons — right side, with a small right margin so they
         * stay clear of the user's avatar. */}
        <div className="flex items-center gap-0.5 shrink-0 mr-12">
          <PreviewIconButton
            onClick={handleCopyLink}
            disabled={!file || copying}
            title="Copy share link"
            ariaLabel="Copy share link"
          >
            {copying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </PreviewIconButton>
          <PreviewIconButton
            onClick={handleDownload}
            disabled={!file || downloading}
            title="Download"
            ariaLabel="Download"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </PreviewIconButton>
          <PreviewIconButton
            onClick={handleOpen}
            disabled={!file}
            title="Open full view"
            ariaLabel="Open full view"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </PreviewIconButton>
          {/* All other file actions (Rename, Visibility, Show details,
           * Show versions, Duplicate, Delete, …) live in the full menu
           * here. Same items the user gets from a right-click anywhere
           * else in the app — single source via useFileMenuActions. */}
          <FileContextMenu fileId={fileId}>
            <button
              type="button"
              title="More actions"
              aria-label="More actions"
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!file}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </FileContextMenu>
        </div>
      </div>

      {/* Tabs — Preview / Versions. Hidden when there's only one tab worth
       * showing (always two for files; future: maybe Activity, Permissions). */}
      <div
        className="flex items-center gap-0 border-b border-border bg-card shrink-0"
        role="tablist"
        aria-label="Preview tabs"
      >
        <PreviewTabButton
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Preview"
          active={activeTab === "preview"}
          onClick={() => setActiveTab("preview")}
        />
        <PreviewTabButton
          icon={<Info className="h-3.5 w-3.5" />}
          label="Info"
          active={activeTab === "info"}
          onClick={() => setActiveTab("info")}
        />
        <PreviewTabButton
          icon={<History className="h-3.5 w-3.5" />}
          label="Versions"
          active={activeTab === "versions"}
          onClick={() => setActiveTab("versions")}
        />
      </div>

      {/* Body — both tabs stay MOUNTED, only their visibility toggles.
       *
       * Why: every fetch-based previewer (PDF, Markdown, Code, Text, Data)
       * goes through `useFileBlob`, which fetches the bytes and revokes
       * the blob URL on unmount. If we conditionally rendered tabs, the
       * Preview tab would unmount whenever the user clicked Versions —
       * losing a 10MB PDF download and forcing a full re-fetch on
       * return. Always-mounted with `hidden` keeps the blob alive.
       *
       * Each tab has its own error boundary so a crash in one doesn't
       * blank the other.
       */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className="absolute inset-0 overflow-hidden"
          hidden={activeTab !== "preview"}
          aria-hidden={activeTab !== "preview"}
        >
          <PreviewErrorBoundary fileId={fileId}>
            <FilePreview fileId={fileId} className="h-full w-full" />
          </PreviewErrorBoundary>
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          hidden={activeTab !== "info"}
          aria-hidden={activeTab !== "info"}
        >
          <FileInfoTab fileId={fileId} className="h-full w-full" />
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          hidden={activeTab !== "versions"}
          aria-hidden={activeTab !== "versions"}
        >
          <FileVersionsList fileId={fileId} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

function PreviewTabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Local sub-component ─────────────────────────────────────────────────

interface PreviewIconButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  ariaLabel: string;
  disabled?: boolean;
  tone?: "default" | "muted";
}

function PreviewIconButton({
  onClick,
  children,
  title,
  ariaLabel,
  disabled,
  tone = "default",
}: PreviewIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tone === "muted"
          ? "text-muted-foreground hover:bg-accent hover:text-foreground"
          : "text-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
