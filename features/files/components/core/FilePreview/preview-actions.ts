/**
 * features/files/components/core/FilePreview/preview-actions.ts
 *
 * Per-file-type action registry. Given a file, returns the list of buttons
 * the shared <PreviewerActionBar> should render. Action handlers come from
 * `useFileActions` (download, copyShareUrl, etc.) plus a few preview-only
 * helpers passed in by the host.
 */

"use client";

import {
  Copy,
  Download,
  Edit3,
  Maximize2,
  Trash2,
} from "lucide-react";
import type { CloudFileRecord } from "@/features/files/types";
import type { PreviewKind } from "@/features/files/utils/preview-capabilities";
import type { PreviewerAction } from "./PreviewerActionBar/PreviewerActionBar";

export interface BuildPreviewActionsArgs {
  file: CloudFileRecord;
  previewKind: PreviewKind;
  /** Triggers `useFileActions.download`. */
  onDownload: () => void | Promise<void>;
  /** Copies the signed share URL to clipboard. */
  onCopyLink: () => void | Promise<void>;
  /** Routes / opens the canonical full-screen preview. */
  onOpenFullView: () => void | Promise<void>;
  /** Triggers the rename dialog. */
  onRename: () => void;
  /** Triggers the soft-delete confirm flow. */
  onDelete: () => void;
  /** Triggers the in-place editor handoff (Code / Markdown / Text only). */
  onEdit?: () => void | Promise<void>;
}

const EDITABLE_KINDS: ReadonlyArray<PreviewKind> = ["code", "markdown", "text"];

export function buildPreviewActions(
  args: BuildPreviewActionsArgs,
): PreviewerAction[] {
  const {
    previewKind,
    onDownload,
    onCopyLink,
    onOpenFullView,
    onRename,
    onDelete,
    onEdit,
  } = args;

  const actions: PreviewerAction[] = [];

  if (EDITABLE_KINDS.includes(previewKind)) {
    actions.push({
      id: "edit",
      label: "Edit",
      icon: Edit3,
      onClick: () => onEdit?.(),
      primary: true,
      disabled: !onEdit,
      disabledHint: !onEdit ? "Edit handoff not wired yet" : undefined,
    });
  }

  actions.push(
    {
      id: "download",
      label: "Download",
      icon: Download,
      onClick: onDownload,
      primary: true,
    },
    {
      id: "copy-link",
      label: "Copy link",
      icon: Copy,
      onClick: onCopyLink,
      primary: true,
    },
    {
      id: "open-full",
      label: "Open full view",
      icon: Maximize2,
      onClick: onOpenFullView,
      primary: false,
    },
    {
      id: "rename",
      label: "Rename",
      icon: Edit3,
      onClick: onRename,
      primary: false,
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      onClick: onDelete,
      primary: false,
    },
  );

  return actions;
}
