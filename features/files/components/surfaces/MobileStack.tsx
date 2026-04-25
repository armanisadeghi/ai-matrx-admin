/**
 * features/files/components/surfaces/MobileStack.tsx
 *
 * iOS hierarchical push-nav for file management. Root → folder → folder →
 * file detail. Uses CSS transforms for slide transitions. Swipe-back is
 * handled by the system back-gesture (we route it through `handlePop`).
 *
 * Follows .cursor/skills/ios-mobile-first/SKILL.md:
 *   - `dvh`, not `vh`.
 *   - `pb-safe` on action bars.
 *   - Inputs at 16px (not applicable here; no forms).
 *   - No tabs; stacked push-nav instead.
 *   - No nested scrolling; each level has a single scroll area.
 *   - Dialogs replaced with Drawers (handled in DrawerShell for pickers).
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpFromLine, ChevronLeft, Home, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllFilesMap,
  selectAllFoldersMap,
  selectSortedChildrenOfFolder,
  selectSortedRootChildren,
} from "@/features/files/redux/selectors";
import {
  setActiveFileId,
  setActiveFolderId,
} from "@/features/files/redux/slice";
import { loadFolderContents } from "@/features/files/redux/thunks";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import { FileMeta } from "@/features/files/components/core/FileMeta/FileMeta";
import { FilePreview } from "@/features/files/components/core/FilePreview/FilePreview";
import { FileUploadDropzone } from "@/features/files/components/core/FileUploadDropzone/FileUploadDropzone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FolderFrame = { kind: "folder"; folderId: string | null };
type FileFrame = { kind: "file"; fileId: string };
type Frame = FolderFrame | FileFrame;

export interface MobileStackProps {
  initialFolderId?: string | null;
  initialFileId?: string | null;
  className?: string;
  /** Optional header override. */
  titleSlot?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function MobileStack({
  initialFolderId,
  initialFileId,
  className,
  titleSlot,
}: MobileStackProps) {
  const [stack, setStack] = useState<Frame[]>(() => {
    const base: Frame[] = [{ kind: "folder", folderId: null }];
    if (initialFolderId) {
      base.push({ kind: "folder", folderId: initialFolderId });
    }
    if (initialFileId) {
      base.push({ kind: "file", fileId: initialFileId });
    }
    return base;
  });
  const topFrame = stack[stack.length - 1];

  const push = useCallback((frame: Frame) => {
    setStack((prev) => [...prev, frame]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length <= 1 ? prev : prev.slice(0, -1)));
  }, []);

  const popTo = useCallback((index: number) => {
    setStack((prev) => prev.slice(0, Math.max(1, index + 1)));
  }, []);

  // Back-gesture: Android hardware back + browser back.
  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      if (stack.length > 1) {
        event.preventDefault?.();
        pop();
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [stack.length, pop]);

  return (
    <div
      className={cn(
        "relative h-[calc(100dvh-var(--header-height))] w-full overflow-hidden bg-background",
        className,
      )}
    >
      {stack.map((frame, idx) => {
        const isTop = idx === stack.length - 1;
        return (
          <Frame
            key={`${idx}-${frameKey(frame)}`}
            frame={frame}
            isTop={isTop}
            depth={idx}
            onBack={pop}
            onPush={push}
            onJumpTo={popTo}
            titleSlot={idx === 0 ? titleSlot : undefined}
          />
        );
      })}

      {/* Optional bottom action bar — renders on the top frame only */}
      {topFrame.kind === "folder" ? (
        <FloatingUploadAction parentFolderId={topFrame.folderId} />
      ) : null}
    </div>
  );
}

function frameKey(frame: Frame): string {
  return frame.kind === "folder"
    ? `folder-${frame.folderId ?? "root"}`
    : `file-${frame.fileId}`;
}

// ---------------------------------------------------------------------------
// Frame (slides in from right)
// ---------------------------------------------------------------------------

interface FrameProps {
  frame: Frame;
  isTop: boolean;
  depth: number;
  onBack: () => void;
  onPush: (frame: Frame) => void;
  onJumpTo: (index: number) => void;
  titleSlot?: React.ReactNode;
}

function Frame({ frame, isTop, depth, onBack, onPush, titleSlot }: FrameProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col bg-background",
        "transition-transform duration-300 ease-out will-change-transform",
        !isTop && "-translate-x-[20%] opacity-80",
      )}
      style={{ zIndex: depth }}
      data-frame-top={isTop ? "true" : undefined}
    >
      {frame.kind === "folder" ? (
        <FolderFrameBody
          folderId={frame.folderId}
          onBack={depth === 0 ? undefined : onBack}
          onPush={onPush}
          titleSlot={titleSlot}
        />
      ) : (
        <FileFrameBody fileId={frame.fileId} onBack={onBack} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder frame
// ---------------------------------------------------------------------------

interface FolderFrameBodyProps {
  folderId: string | null;
  onBack?: () => void;
  onPush: (frame: Frame) => void;
  titleSlot?: React.ReactNode;
}

function FolderFrameBody({
  folderId,
  onBack,
  onPush,
  titleSlot,
}: FolderFrameBodyProps) {
  const dispatch = useAppDispatch();
  const foldersById = useAppSelector(selectAllFoldersMap);
  const filesById = useAppSelector(selectAllFilesMap);
  const rootSorted = useAppSelector(selectSortedRootChildren);
  const folderSorted = useAppSelector((s) =>
    folderId
      ? selectSortedChildrenOfFolder(s, folderId)
      : { folderIds: [], fileIds: [] },
  );
  const children = folderId ? folderSorted : rootSorted;

  const folder = folderId ? foldersById[folderId] : null;
  const title = folder?.folderName ?? "Files";

  useEffect(() => {
    if (!folderId) return;
    void dispatch(loadFolderContents({ folderId }));
  }, [dispatch, folderId]);

  useEffect(() => {
    dispatch(setActiveFolderId(folderId));
  }, [dispatch, folderId]);

  const rows = useMemo(() => {
    const out: { kind: "file" | "folder"; id: string; name: string }[] = [];
    for (const id of children.folderIds) {
      const f = foldersById[id];
      if (f && !f.deletedAt)
        out.push({ kind: "folder", id, name: f.folderName });
    }
    for (const id of children.fileIds) {
      const f = filesById[id];
      if (f && !f.deletedAt) out.push({ kind: "file", id, name: f.fileName });
    }
    return out;
  }, [children, foldersById, filesById]);

  return (
    <>
      <MobileHeader
        title={titleSlot ?? title}
        leftIcon={
          onBack ? (
            <ChevronLeft className="h-6 w-6" />
          ) : (
            <Home className="h-5 w-5" />
          )
        }
        leftLabel={onBack ? "Back" : "Home"}
        onLeftPress={onBack}
      />

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          This folder is empty.
        </div>
      ) : (
        <ul className="flex-1 overflow-auto overscroll-contain divide-y">
          {rows.map((row) => {
            if (row.kind === "folder") {
              const rec = foldersById[row.id];
              if (!rec) return null;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onPush({ kind: "folder", folderId: row.id })}
                    className="flex h-12 w-full items-center gap-3 px-4 text-left active:bg-accent/60"
                  >
                    <FileIcon isFolder size={22} />
                    <span className="flex-1 truncate text-sm">{row.name}</span>
                    <ChevronLeft
                      className="h-4 w-4 rotate-180 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            }
            const rec = filesById[row.id];
            if (!rec) return null;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(setActiveFileId(row.id));
                    onPush({ kind: "file", fileId: row.id });
                  }}
                  className="flex h-14 w-full items-center gap-3 px-4 text-left active:bg-accent/60"
                >
                  <FileIcon fileName={rec.fileName} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{rec.fileName}</div>
                    <FileMeta
                      file={{
                        fileSize: rec.fileSize,
                        updatedAt: rec.updatedAt,
                        visibility: rec.visibility,
                      }}
                      hide={{ visibility: true }}
                      className="mt-0.5"
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// File frame
// ---------------------------------------------------------------------------

interface FileFrameBodyProps {
  fileId: string;
  onBack: () => void;
}

function FileFrameBody({ fileId, onBack }: FileFrameBodyProps) {
  const file = useAppSelector((s) => s.cloudFiles.filesById[fileId]);
  const title = file?.fileName ?? "File";

  return (
    <>
      <MobileHeader
        title={title}
        leftIcon={<ChevronLeft className="h-6 w-6" />}
        leftLabel="Back"
        onLeftPress={onBack}
        rightIcon={<MoreVertical className="h-5 w-5" />}
        rightLabel="Actions"
        onRightPress={() => {
          /* TODO: open actions drawer — Phase 7 */
        }}
      />
      <div className="flex-1 overflow-hidden">
        <FilePreview fileId={fileId} className="h-full w-full" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile header
// ---------------------------------------------------------------------------

interface MobileHeaderProps {
  title: React.ReactNode;
  leftIcon: React.ReactNode;
  leftLabel: string;
  onLeftPress?: () => void;
  rightIcon?: React.ReactNode;
  rightLabel?: string;
  onRightPress?: () => void;
}

function MobileHeader({
  title,
  leftIcon,
  leftLabel,
  onLeftPress,
  rightIcon,
  rightLabel,
  onRightPress,
}: MobileHeaderProps) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b bg-background px-2">
      {onLeftPress ? (
        <button
          type="button"
          onClick={onLeftPress}
          aria-label={leftLabel}
          className="flex h-10 min-w-10 items-center justify-center rounded active:bg-accent/60"
        >
          {leftIcon}
        </button>
      ) : (
        <div className="flex h-10 w-10 items-center justify-center text-muted-foreground">
          {leftIcon}
        </div>
      )}

      <div className="flex-1 truncate text-center text-sm font-medium">
        {title}
      </div>

      {rightIcon && onRightPress ? (
        <button
          type="button"
          onClick={onRightPress}
          aria-label={rightLabel ?? "Actions"}
          className="flex h-10 min-w-10 items-center justify-center rounded active:bg-accent/60"
        >
          {rightIcon}
        </button>
      ) : (
        <div className="min-w-10" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating upload action (bottom right) — respects pb-safe.
// ---------------------------------------------------------------------------

interface FloatingUploadActionProps {
  parentFolderId: string | null;
}

function FloatingUploadAction({ parentFolderId }: FloatingUploadActionProps) {
  const inputId = useMemo(
    () => `mobile-upload-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );
  return (
    <div className="pointer-events-none absolute bottom-0 right-0 flex flex-col items-end gap-2 p-4 pb-safe">
      <FileUploadDropzone
        parentFolderId={parentFolderId}
        mode="overlay"
        className="pointer-events-auto w-0 h-0"
        // Dropzone renders the overlay inside children absolutely — we only
        // want the `open` picker; provide a minimal visible target using a
        // label-for-button pattern is overkill here. Use the hook path: this
        // compact mode relies on clicks via the invisible wrapper.
      >
        <span className="sr-only" id={inputId}>
          Upload
        </span>
      </FileUploadDropzone>
      {/* Simple "+" button that triggers the hidden input. For now we surface
          a simple anchor to the Dropzone's picker via a more ergonomic Phase
          7 hook (useFilePicker). */}
      <button
        type="button"
        onClick={() => {
          // Fallback: dispatch an input click via a transient element.
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.addEventListener("change", async () => {
            if (!input.files?.length) return;
            const files = Array.from(input.files);
            const { store } = await import("@/lib/redux/store").then((mod) => {
              const storeInstance = mod.getStore();
              if (!storeInstance) throw new Error("Store not ready");
              return { store: storeInstance };
            });
            const { uploadFiles } =
              await import("@/features/files/redux/thunks");
            void store.dispatch(
              uploadFiles({
                files,
                parentFolderId,
                visibility: "private",
              }),
            );
          });
          input.click();
        }}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
        aria-label="Upload file"
      >
        <ArrowUpFromLine className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
