/**
 * features/files/components/surfaces/PageShell.tsx
 *
 * Next.js route host — used by app/(a)/cloud-files/**.
 * Desktop: resizable sidebar (FileTree) + main (breadcrumbs + FileList or FilePreview).
 * Mobile: delegates to MobileStack — iOS hierarchical push-nav.
 *
 * Dimensions are locked here so the server-rendered skeleton in loading.tsx
 * can match exactly (zero layout shift).
 *
 * Uses react-resizable-panels v4 API:
 *   - `orientation` (not `direction`) on the group
 *   - `autoSave` persists drag state
 *   - `onResize((size) => size.asPercentage)` — size is an object in v4
 *   - No `maxSize` — use CSS / minSize instead
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { Columns, Grid, List, type LucideIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveFolderId,
  selectAllFilesArray,
  selectAllFoldersArray,
  selectTreeStatus,
  selectViewMode,
} from "../../redux/selectors";
import {
  setActiveFileId,
  setActiveFolderId,
  setViewMode,
} from "../../redux/slice";
import { FileBreadcrumbs } from "../core/FileBreadcrumbs";
import { FileList } from "../core/FileList";
import { FilePreview } from "../core/FilePreview";
import { FileTree } from "../core/FileTree";
import { FileUploadDropzone } from "../core/FileUploadDropzone";
import { OnboardingEmptyState } from "./OnboardingEmptyState";
import { MobileStack } from "./MobileStack";
import type { ViewMode } from "../../types";

export interface PageShellProps {
  /** Initial selection (for deep-linked routes). */
  initialFolderId?: string | null;
  initialFileId?: string | null;
  /** Initial sidebar width as a percent of parent. Default ≈ 22%. */
  sidebarDefaultPercent?: number;
  /** Minimum sidebar width as percent of parent. Default 14. */
  sidebarMinPercent?: number;
  className?: string;
  /** Optional header slot rendered above the breadcrumbs row. */
  headerSlot?: React.ReactNode;
  /** Optional action buttons in the breadcrumbs row (e.g. "New folder"). */
  actions?: React.ReactNode;
}

export function PageShell(props: PageShellProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileStack
        initialFolderId={props.initialFolderId ?? null}
        initialFileId={props.initialFileId ?? null}
        className={props.className}
      />
    );
  }
  return <PageShellDesktop {...props} />;
}

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------

const PANEL_IDS = {
  SIDE: "cloud-files-side",
  MAIN: "cloud-files-main",
} as const;

function PageShellDesktop({
  initialFolderId,
  initialFileId,
  sidebarDefaultPercent = 22,
  sidebarMinPercent = 14,
  className,
  headerSlot,
  actions,
}: PageShellProps) {
  const dispatch = useAppDispatch();
  const activeFolderId = useAppSelector(selectActiveFolderId);
  const activeFileId = useAppSelector((s) => s.cloudFiles.ui.activeFileId);
  const viewMode = useAppSelector(selectViewMode);
  const treeStatus = useAppSelector(selectTreeStatus);
  const allFiles = useAppSelector(selectAllFilesArray);
  const allFolders = useAppSelector(selectAllFoldersArray);

  // One-time apply of initial selection.
  useOneShotSelection(initialFolderId, initialFileId);

  const handleSelectFolder = useCallback(
    (folderId: string) => {
      dispatch(setActiveFolderId(folderId));
      dispatch(setActiveFileId(null));
    },
    [dispatch],
  );

  const handleSelectFile = useCallback(
    (fileId: string) => {
      dispatch(setActiveFileId(fileId));
    },
    [dispatch],
  );

  const handleBreadcrumbNavigate = useCallback(
    (folderId: string | null) => {
      dispatch(setActiveFolderId(folderId));
      dispatch(setActiveFileId(null));
    },
    [dispatch],
  );

  // True only when the tree has loaded AND the user genuinely has nothing.
  // During `loading` / `idle` we don't show the empty state to avoid flashing.
  const treeLoaded = treeStatus === "loaded";
  const isEmpty =
    treeLoaded &&
    allFolders.filter((f) => !f.deletedAt).length === 0 &&
    allFiles.filter((f) => !f.deletedAt).length === 0;

  return (
    <div
      className={cn(
        "h-[calc(100dvh-var(--header-height))] flex overflow-hidden bg-background",
        className,
      )}
    >
      <ResizablePanelGroup
        orientation="horizontal"
        autoSave="matrx-cloud-files"
        className="h-full w-full"
      >
        {/* Sidebar */}
        <ResizablePanel
          id={PANEL_IDS.SIDE}
          defaultSize={sidebarDefaultPercent}
          minSize={sidebarMinPercent}
          className="min-w-0 border-r"
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Files
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileTree
                onSelectFile={handleSelectFile}
                onSelectFolder={handleSelectFolder}
                onActivateFolder={handleSelectFolder}
                onActivateFile={handleSelectFile}
                emptyState={
                  treeLoaded ? (
                    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground px-4 text-center">
                      Your files will appear here.
                    </div>
                  ) : undefined
                }
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main */}
        <ResizablePanel id={PANEL_IDS.MAIN} minSize={30}>
          <div className="flex h-full flex-col overflow-hidden">
            {headerSlot ? (
              <div className="shrink-0 border-b">{headerSlot}</div>
            ) : null}

            {/* Breadcrumbs + actions row */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b bg-muted/20 shrink-0">
              <FileBreadcrumbs
                folderId={activeFolderId}
                onNavigate={handleBreadcrumbNavigate}
              />
              <div className="flex items-center gap-1">
                <ViewModeToggle viewMode={viewMode} />
                {actions}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {activeFileId ? (
                <FilePreview
                  fileId={activeFileId}
                  className="h-full w-full"
                />
              ) : isEmpty ? (
                <FileUploadDropzone
                  parentFolderId={null}
                  mode="overlay"
                  className="h-full w-full"
                >
                  <OnboardingEmptyState />
                </FileUploadDropzone>
              ) : (
                <FileUploadDropzone
                  parentFolderId={activeFolderId}
                  mode="overlay"
                  className="h-full w-full"
                >
                  <FileList
                    folderId={activeFolderId}
                    onActivateFile={handleSelectFile}
                    onActivateFolder={handleSelectFolder}
                    className="h-full w-full"
                  />
                </FileUploadDropzone>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useOneShotSelection(
  initialFolderId: string | null | undefined,
  initialFileId: string | null | undefined,
): void {
  const dispatch = useAppDispatch();
  const didRunRef = useRef(false);

  // MUST NOT dispatch during render — that triggers setState in Redux
  // subscribers (the realtime middleware, connected components, etc.) while
  // this component is still rendering, which is what React 19 / Next 16 flag
  // as "Cannot update a component while rendering a different component".
  //
  // We fire the initial dispatch in a `useEffect` instead. The ref guards
  // against StrictMode's double-invocation. URL navigations re-mount this
  // component (route change), so the initial props are fresh on every mount
  // and we don't need to re-apply on prop changes.
  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    if (initialFolderId !== undefined) {
      dispatch(setActiveFolderId(initialFolderId));
    }
    if (initialFileId !== undefined) {
      dispatch(setActiveFileId(initialFileId));
    }
    // Intentionally only on mount — initial* is the seed, not a live prop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

interface ViewModeToggleProps {
  viewMode: ViewMode;
}

function ViewModeToggle({ viewMode }: ViewModeToggleProps) {
  const dispatch = useAppDispatch();
  const options: { mode: ViewMode; icon: LucideIcon; label: string }[] = [
    { mode: "list", icon: List, label: "List" },
    { mode: "grid", icon: Grid, label: "Grid" },
    { mode: "columns", icon: Columns, label: "Columns" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="inline-flex items-center rounded-md border bg-background p-0.5"
    >
      {options.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={viewMode === mode}
          aria-label={label}
          onClick={() => dispatch(setViewMode(mode))}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded",
            viewMode === mode
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
