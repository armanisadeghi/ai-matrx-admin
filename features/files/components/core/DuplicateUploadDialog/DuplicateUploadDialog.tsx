/**
 * features/files/components/core/DuplicateUploadDialog/DuplicateUploadDialog.tsx
 *
 * Drive- / Dropbox-style "looks like you've uploaded these before"
 * confirmation. Mounted by `UploadGuardHost` whenever the pre-flight
 * duplicate scan turned up at least one conflict. Each row offers
 * three actions:
 *
 *   - **Overwrite**  — re-upload to the existing file's exact path.
 *                      The Python backend version-bumps in place;
 *                      previous versions are recoverable from the
 *                      Versions tab.
 *   - **Make a copy** — proceed with a unique " (1)" / " (2)" name.
 *                      Same as the existing collision behaviour, just
 *                      now opt-in instead of silent.
 *   - **Skip**       — don't upload this file at all. Useful when the
 *                      identical-content match means the user already
 *                      has what they need.
 *
 * The "Apply to all" toggle batches the same decision across every
 * remaining conflict so the user doesn't have to click N times for a
 * folder-drop with many duplicates.
 *
 * Identical-content matches default to **Skip**; pure name conflicts
 * default to **Make a copy**. Those defaults match what most users
 * actually want and shorten the path to "OK". They are still
 * overridable per-row.
 */

"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FileWarning, RotateCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/features/files/utils/format";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import type { CloudFile } from "@/features/files/types";
import type { DuplicateMatch } from "@/features/files/utils/upload-duplicate-detect";

export type DuplicateAction = "overwrite" | "copy" | "skip";

export interface DuplicateUploadDialogProps {
  open: boolean;
  /**
   * Conflicts to resolve. One per file the user dropped that triggered
   * a duplicate match. Files without a match are uploaded directly
   * by the host and never reach this dialog.
   */
  conflicts: DuplicateConflictRow[];
  /** User confirmed — proceed with the per-row decisions. */
  onResolve: (decisions: ResolvedDecision[]) => void;
  /** User dismissed the dialog (X / Esc / Cancel). Cancel ALL pending uploads. */
  onCancel: () => void;
}

export interface DuplicateConflictRow {
  /**
   * Stable id for this conflict row. Lets the dialog rebuild its
   * decisions map without relying on File-reference identity.
   */
  id: string;
  file: File;
  match: DuplicateMatch;
}

export interface ResolvedDecision {
  id: string;
  action: DuplicateAction;
}

export function DuplicateUploadDialog({
  open,
  conflicts,
  onResolve,
  onCancel,
}: DuplicateUploadDialogProps) {
  // Decisions are keyed on the conflict id (NOT File ref) so they
  // survive React reordering. Defaults are picked per match kind:
  // identical-content → skip, name-only → copy.
  const [decisions, setDecisions] = useState<Record<string, DuplicateAction>>(
    () => buildDefaultDecisions(conflicts),
  );
  const [applyToAll, setApplyToAll] = useState(false);

  // Re-seed defaults if the dialog opens with a fresh conflicts list.
  useEffect(() => {
    if (open) {
      setDecisions(buildDefaultDecisions(conflicts));
      setApplyToAll(false);
    }
  }, [open, conflicts]);

  const setOne = (id: string, action: DuplicateAction) => {
    if (applyToAll) {
      // Apply this choice to EVERY remaining row. Useful for big
      // batch uploads where the user makes one decision and is done.
      const next: Record<string, DuplicateAction> = {};
      for (const c of conflicts) next[c.id] = action;
      setDecisions(next);
    } else {
      setDecisions((d) => ({ ...d, [id]: action }));
    }
  };

  const handleConfirm = () => {
    onResolve(
      conflicts.map((c) => ({ id: c.id, action: decisions[c.id] ?? "skip" })),
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-2xl flex flex-col max-h-[85dvh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-500" />
            {conflicts.length === 1
              ? "This file looks familiar"
              : `${conflicts.length} files look familiar`}
          </DialogTitle>
          <DialogDescription>
            {conflicts.length === 1
              ? "Choose what to do with the duplicate before uploading."
              : "Choose what to do with each duplicate. Use “Apply to all” to make one decision for everything."}
          </DialogDescription>
        </DialogHeader>

        {/* Apply-to-all toggle */}
        {conflicts.length > 1 ? (
          <div className="flex items-center gap-2 px-1 py-2 border-y bg-muted/30">
            <input
              type="checkbox"
              id="apply-to-all"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor="apply-to-all" className="text-xs">
              Apply my next choice to all {conflicts.length} duplicates
            </label>
          </div>
        ) : null}

        {/* Scrollable conflict list */}
        <div className="flex-1 min-h-0 overflow-auto -mx-6 px-6">
          <ul className="flex flex-col gap-2 py-2">
            {conflicts.map((c) => (
              <ConflictRow
                key={c.id}
                conflict={c}
                action={decisions[c.id] ?? "skip"}
                onChange={(action) => setOne(c.id, action)}
              />
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel all
          </Button>
          <Button onClick={handleConfirm}>
            <Check className="h-4 w-4 mr-1.5" />
            Continue with selections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// One row in the conflict list
// ---------------------------------------------------------------------------

function ConflictRow({
  conflict,
  action,
  onChange,
}: {
  conflict: DuplicateConflictRow;
  action: DuplicateAction;
  onChange: (action: DuplicateAction) => void;
}) {
  const { file, match } = conflict;
  const description = describeMatch(match, file);

  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <FileIcon fileName={file.name} size={20} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {formatFileSize(file.size)} · uploading
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-border/40">
        <ActionPill
          icon={<RotateCw className="h-3 w-3" />}
          label="Overwrite"
          tooltip={
            match.kind === "identical_content_other_folder"
              ? "Not available — the existing file is in another folder."
              : "Save as a new version of the existing file. Old versions remain in the Versions tab."
          }
          // Cross-folder overwrite would require moving the existing
          // file; out of scope. Disable that case.
          disabled={match.kind === "identical_content_other_folder"}
          active={action === "overwrite"}
          onClick={() => onChange("overwrite")}
        />
        <ActionPill
          icon={<Copy className="h-3 w-3" />}
          label="Make a copy"
          tooltip="Upload as a separate file with an auto-numbered suffix, e.g. 'report (1).pdf'."
          active={action === "copy"}
          onClick={() => onChange("copy")}
        />
        <ActionPill
          icon={<X className="h-3 w-3" />}
          label="Skip"
          tooltip="Don't upload this file. The existing copy stays as-is."
          active={action === "skip"}
          onClick={() => onChange("skip")}
        />
      </div>
    </li>
  );
}

function ActionPill({
  icon,
  label,
  tooltip,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDefaultDecisions(
  conflicts: DuplicateConflictRow[],
): Record<string, DuplicateAction> {
  const out: Record<string, DuplicateAction> = {};
  for (const c of conflicts) {
    // Identical content → skip is the safer default. Pure name
    // conflict → copy preserves both files.
    out[c.id] =
      c.match.kind === "identical_content_same_folder"
        ? "skip"
        : c.match.kind === "identical_content_other_folder"
          ? "skip"
          : "copy";
  }
  return out;
}

function describeMatch(match: DuplicateMatch, file: File): string {
  const existing = match.existing;
  switch (match.kind) {
    case "identical_content_same_folder":
      return `Identical bytes already saved here as “${existing.fileName}” — uploading again would just create another copy of the same content.`;
    case "name_only":
      return `A different file named “${existing.fileName}” already exists in this folder${
        existing.fileSize != null
          ? ` (${formatFileSize(existing.fileSize)})`
          : ""
      }.`;
    case "identical_content_other_folder": {
      const path = pathLabelFor(existing);
      return `Same exact bytes are already saved at ${path}. Uploading here will keep both unless you skip.`;
    }
    default:
      void file;
      return "Possible duplicate detected.";
  }
}

function pathLabelFor(file: CloudFile): string {
  // The full server path is the most informative thing we have client-
  // side without resolving folder ancestry; trim the leading slash.
  const path = file.filePath.replace(/^\/+/, "");
  return path ? `“/${path}”` : `“${file.fileName}”`;
}

export default DuplicateUploadDialog;
