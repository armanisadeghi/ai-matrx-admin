/**
 * features/files/components/surfaces/PageShell.tsx
 *
 * Dropbox-style shell for the `/cloud-files` route family. Renders every
 * sibling section (All files, Photos, Shared, File requests, Deleted files,
 * Starred, Activity, Folders) from the same layout — pass `section` to pick.
 *
 * Composition:
 *   IconRail (60px fixed)
 *   │
 *   └── ResizablePanelGroup
 *         ├── NavSidebar (resizable, cookie-persisted)
 *         └── Main pane
 *               ├── TopBar (+ New, search)
 *               ├── ContentHeader (breadcrumbs, title, actions, chips, toggle)
 *               └── File table / grid / file preview / empty state
 *
 * Mobile delegates to the existing MobileStack — that surface remains
 * unchanged in this pass.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  FileInput,
  FileStack,
  Image as ImageIcon,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveFileId,
  selectActiveFolderId,
  selectAllFilesArray,
  selectAllFilesMap,
  selectAllFoldersArray,
  selectTreeStatus,
  selectViewMode,
} from "../../redux/selectors";
import { setActiveFileId, setActiveFolderId } from "../../redux/slice";
import { FilePreview } from "../core/FilePreview";
import { FileTree } from "../core/FileTree";
import { FileUploadDropzone } from "../core/FileUploadDropzone";
import { OnboardingEmptyState } from "./OnboardingEmptyState";
import { MobileStack } from "./MobileStack";
import {
  ContentHeader,
  EmptyState,
  FileGrid,
  FileTable,
  IconRail,
  NavSidebar,
  SidebarModeProvider,
  TopBar,
} from "./dropbox";
import type { CloudFilesSection, FilterChipKey, SidebarMode } from "./dropbox";

export interface PageShellProps {
  /** Initial selection (for deep-linked routes). */
  initialFolderId?: string | null;
  initialFileId?: string | null;
  /** Which section the current route represents. Defaults to "all". */
  section?: CloudFilesSection;
  /** Server-read cookie value so the sidebar mode matches the user's preference on first paint. */
  initialSidebarMode?: SidebarMode;
  /** Initial sidebar width as a percent of parent. Default 18. */
  sidebarDefaultPercent?: number;
  sidebarMinPercent?: number;
  className?: string;
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
  return (
    <SidebarModeProvider initialMode={props.initialSidebarMode ?? "flat"}>
      <PageShellDesktop {...props} />
    </SidebarModeProvider>
  );
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
  section = "all",
  sidebarDefaultPercent = 18,
  sidebarMinPercent = 14,
  className,
}: PageShellProps) {
  const dispatch = useAppDispatch();
  const activeFolderId = useAppSelector(selectActiveFolderId);
  const activeFileId = useAppSelector(selectActiveFileId);
  const viewMode = useAppSelector(selectViewMode);
  const treeStatus = useAppSelector(selectTreeStatus);
  const allFiles = useAppSelector(selectAllFilesArray);
  const allFolders = useAppSelector(selectAllFoldersArray);
  const filesById = useAppSelector(selectAllFilesMap);
  const permissionsByResourceId = useAppSelector(
    (s) => s.cloudFiles.permissionsByResourceId,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterChipKey | null>(null);

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

  const handleFilterToggle = useCallback((key: FilterChipKey) => {
    setFilter((prev) => (prev === key ? null : key));
  }, []);

  const treeLoaded = treeStatus === "loaded";
  const isEmpty =
    treeLoaded &&
    allFolders.filter((f) => !f.deletedAt).length === 0 &&
    allFiles.filter((f) => !f.deletedAt).length === 0;

  // Folder contents for the active folder (or root).
  const rootFolders = useMemo(
    () =>
      allFolders.filter((f) => f.parentId === activeFolderId && !f.deletedAt),
    [allFolders, activeFolderId],
  );
  const rootFiles = useMemo(
    () =>
      allFiles.filter(
        (f) => f.parentFolderId === activeFolderId && !f.deletedAt,
      ),
    [allFiles, activeFolderId],
  );
  // For filter / photos / shared sections, we want tree-wide matches; for
  // trash, we include every deleted file.
  const scopedFolders = useMemo(() => {
    if (
      section === "all" ||
      section === "folders" ||
      section === "folders-root"
    ) {
      return rootFolders;
    }
    if (section === "trash") {
      return allFolders.filter((f) => f.deletedAt);
    }
    return allFolders.filter((f) => !f.deletedAt);
  }, [section, rootFolders, allFolders]);
  const scopedFiles = useMemo(() => {
    if (
      section === "all" ||
      section === "folders" ||
      section === "folders-root"
    ) {
      return rootFiles;
    }
    if (section === "trash") {
      return allFiles.filter((f) => f.deletedAt);
    }
    return allFiles.filter((f) => !f.deletedAt);
  }, [section, rootFiles, allFiles]);

  const showPlaceholder = section === "requests" || section === "activity";
  const showTableOrGrid =
    !showPlaceholder &&
    !activeFileId &&
    !(isEmpty && (section === "all" || section === "folders"));

  const activeFile = activeFileId ? filesById[activeFileId] : null;

  return (
    <div
      style={{ height: "calc(100dvh - var(--header-height))" }}
      className={cn(
        "flex w-full flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1">
        <IconRail section={section} />

        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full min-h-0 flex-1"
        >
          {/* Nav sidebar */}
          <ResizablePanel
            id={PANEL_IDS.SIDE}
            defaultSize={sidebarDefaultPercent}
            minSize={sidebarMinPercent}
            maxSize={40}
            className="min-w-0 border-r border-border/70"
          >
            <NavSidebar section={section} />
          </ResizablePanel>

          <ResizableHandle />

          {/* Main */}
          <ResizablePanel id={PANEL_IDS.MAIN} minSize={40}>
            <div className="flex h-full flex-col overflow-hidden">
            <TopBar
              parentFolderId={activeFolderId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {section === "folders" ? (
              <FolderExplorer
                onSelectFolder={handleSelectFolder}
                onSelectFile={handleSelectFile}
              />
            ) : (
              <>
                <ContentHeader
                  section={section}
                  activeFolderId={activeFolderId}
                  activeFilter={filter}
                  onFilterToggle={handleFilterToggle}
                  showActions={
                    !showPlaceholder &&
                    section !== "trash" &&
                    section !== "starred"
                  }
                  showFilterRow={
                    !showPlaceholder &&
                    section !== "trash" &&
                    section !== "starred"
                  }
                />

                <div className="flex-1 overflow-hidden">
                  {activeFile ? (
                    <FilePreview
                      fileId={activeFile.id}
                      className="h-full w-full"
                    />
                  ) : showPlaceholder ? (
                    <SectionPlaceholder section={section} />
                  ) : isEmpty && section === "all" ? (
                    <FileUploadDropzone
                      parentFolderId={null}
                      mode="overlay"
                      className="h-full w-full"
                    >
                      <OnboardingEmptyState />
                    </FileUploadDropzone>
                  ) : section === "starred" ? (
                    <EmptyState
                      icon={Star}
                      title="Starred items"
                      comingSoon
                      description="Star any file or folder to pin it here for quick access."
                    />
                  ) : showTableOrGrid ? (
                    <FileUploadDropzone
                      parentFolderId={activeFolderId}
                      mode="overlay"
                      className="h-full w-full"
                    >
                      {viewMode === "grid" ? (
                        <FileGrid
                          folders={scopedFolders}
                          files={scopedFiles}
                          permissionsByResourceId={permissionsByResourceId}
                          section={section}
                          searchQuery={searchQuery}
                          filter={filter}
                          onActivateFolder={handleSelectFolder}
                          onActivateFile={handleSelectFile}
                          emptyState={
                            section === "photos" ||
                            section === "shared" ||
                            section === "trash" ? (
                              <SectionPlaceholder section={section} />
                            ) : undefined
                          }
                        />
                      ) : (
                        <FileTable
                          folders={scopedFolders}
                          files={scopedFiles}
                          permissionsByResourceId={permissionsByResourceId}
                          section={section}
                          searchQuery={searchQuery}
                          filter={filter}
                          onActivateFolder={handleSelectFolder}
                          onActivateFile={handleSelectFile}
                          emptyState={
                            section === "photos" ||
                            section === "shared" ||
                            section === "trash" ? (
                              <SectionPlaceholder section={section} />
                            ) : undefined
                          }
                        />
                      )}
                    </FileUploadDropzone>
                  ) : null}
                </div>
              </>
            )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function SectionPlaceholder({ section }: { section: CloudFilesSection }) {
  if (section === "requests") {
    return (
      <EmptyState
        icon={FileInput}
        title="File requests"
        comingSoon
        description="Collect files from anyone with a shareable link. Requests will be tracked here."
      />
    );
  }
  if (section === "activity") {
    return (
      <EmptyState
        icon={Activity}
        title="Activity"
        comingSoon
        description="A live feed of uploads, shares, and edits across your files will appear here."
      />
    );
  }
  if (section === "shared") {
    return (
      <EmptyState
        icon={Share2}
        title="Nothing shared yet"
        description="Files and folders shared with you will appear here."
      />
    );
  }
  if (section === "photos") {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No photos yet"
        description="Image files you upload will appear here automatically."
      />
    );
  }
  if (section === "trash") {
    return (
      <EmptyState
        icon={Trash2}
        title="Trash is empty"
        description="Deleted files stay here for 30 days before they're purged."
      />
    );
  }
  return null;
}

interface FolderExplorerProps {
  onSelectFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
}

function FolderExplorer({ onSelectFolder, onSelectFile }: FolderExplorerProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3 shrink-0">
        <FileStack className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold tracking-tight">Folders</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <FileTree
          onSelectFile={onSelectFile}
          onSelectFolder={onSelectFolder}
          onActivateFolder={onSelectFolder}
          onActivateFile={onSelectFile}
          className="h-full"
        />
      </div>
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

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    if (initialFolderId !== undefined) {
      dispatch(setActiveFolderId(initialFolderId));
    }
    if (initialFileId !== undefined) {
      dispatch(setActiveFileId(initialFileId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
