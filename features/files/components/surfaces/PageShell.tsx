/**
 * features/files/components/surfaces/PageShell.tsx
 *
 * Next.js route host — used by [app/(a)/cloud-files/**](../../../../app/(a)/cloud-files).
 * Desktop: resizable sidebar (FileTree) + main (breadcrumbs + FileList or FilePreview).
 * Mobile: delegates to MobileStack — iOS hierarchical push-nav.
 *
 * Dimensions are locked here so the server-rendered skeleton in loading.tsx
 * can match exactly (zero layout shift).
 */

"use client";

import { useCallback, useMemo } from "react";
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
import { MobileStack } from "./MobileStack";
import type { ViewMode } from "../../types";

export interface PageShellProps {
  /** Initial selection (for deep-linked routes). */
  initialFolderId?: string | null;
  initialFileId?: string | null;
  /** Fixed sidebar width in pixels (desktop). Default 280. */
  sidebarWidth?: number;
  /** Minimum sidebar width as percent of parent (react-resizable-panels). */
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

function PageShellDesktop({
  initialFolderId,
  initialFileId,
  sidebarWidth = 280,
  sidebarMinPercent = 15,
  className,
  headerSlot,
  actions,
}: PageShellProps) {
  const dispatch = useAppDispatch();
  const activeFolderId = useAppSelector(selectActiveFolderId);
  const activeFileId = useAppSelector((s) => s.cloudFiles.ui.activeFileId);
  const viewMode = useAppSelector(selectViewMode);

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

  return (
    <div
      className={cn(
        "h-[calc(100dvh-var(--header-height))] flex overflow-hidden bg-background",
        className,
      )}
    >
      <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
        {/* Sidebar */}
        <ResizablePanel
          defaultSize={sidebarPercentFromPx(sidebarWidth)}
          minSize={sidebarMinPercent}
          maxSize={40}
          className="flex flex-col overflow-hidden border-r"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
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
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main */}
        <ResizablePanel className="flex flex-col overflow-hidden">
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

          {/* Content: file preview takes precedence over list when active */}
          <div className="flex-1 overflow-hidden">
            {activeFileId ? (
              <FilePreview fileId={activeFileId} className="h-full w-full" />
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
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sidebarPercentFromPx(px: number): number {
  // Rough default at a 1280px viewport. react-resizable-panels only accepts %.
  return Math.max(10, Math.min(40, Math.round((px / 1280) * 100)));
}

function useOneShotSelection(
  initialFolderId: string | null | undefined,
  initialFileId: string | null | undefined,
): void {
  const dispatch = useAppDispatch();
  // Use lazy init pattern so we only apply the initial selection once per
  // component mount (not on prop changes — URL navigations should re-mount).
  useMemo(() => {
    if (initialFolderId !== undefined)
      dispatch(setActiveFolderId(initialFolderId));
    if (initialFileId !== undefined) dispatch(setActiveFileId(initialFileId));
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
