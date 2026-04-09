"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  AppWindow,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Columns3,
  Rows3,
  FileJson,
  StickyNote,
  Mic,
  Bug,
  MessageSquare,
  Activity,
  FileCode2,
  Settings,
  Mail,
  Share2,
  CheckSquare,
  Database,
  FolderSearch,
  Wand2,
  Globe,
  Layers,
  FileScan,
  MonitorPlay,
  Newspaper,
  ListFilter,
  GalleryHorizontalEnd,
  SlidersHorizontal,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  toggleWindowsHidden,
  minimizeAll,
  restoreAll,
  restoreWindow,
  focusWindow,
  selectWindowsHidden,
  selectAllWindows,
  selectAllMinimized,
  type WindowState,
  arrangeActiveWindows,
} from "@/lib/redux/slices/windowManagerSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { LayoutIconButton } from "@/features/window-panels/components/LayoutIcon";

// ─── State dot colours ────────────────────────────────────────────────────────

const STATE_DOT: Record<WindowState, string> = {
  windowed: "bg-emerald-400",
  minimized: "bg-amber-400",
  maximized: "bg-blue-400",
};

const STATE_LABEL: Record<WindowState, string> = {
  windowed: "Open",
  minimized: "Minimized",
  maximized: "Maximized",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarWindowToggle() {
  const dispatch = useAppDispatch();
  const hidden = useAppSelector(selectWindowsHidden);
  const allMinimized = useAppSelector(selectAllMinimized);
  const windows = useAppSelector(selectAllWindows);
  const hasWindows = windows.length > 0;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"visibility" | "layout" | "tools">(
    "tools",
  );
  const [layoutDirX, setLayoutDirX] = useState<"ltr" | "rtl">("rtl");
  const [layoutDirY, setLayoutDirY] = useState<"ttb" | "btt">("ttb");
  const [layoutPrimary, setLayoutPrimary] = useState<"horizontal" | "vertical">(
    "vertical",
  );
  const [pos, setPos] = useState({ x: 0, bottom: 0 });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Measure trigger and open/close
  const handleToggle = useCallback(() => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      // Place menu to the right of the button, growing upward from the button's bottom edge
      setPos({ x: r.right + 8, bottom: window.innerHeight - r.bottom });
    }
    setOpen((v) => !v);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const act = useCallback((fn: () => void) => {
    fn();
    setOpen(false);
  }, []);

  return (
    <>
      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "shell-nav-item shell-tactile",
          (open || hidden) && "shell-nav-item-active",
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Manage floating windows"
        title="Windows"
      >
        <span className="shell-nav-icon">
          <AppWindow size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label flex items-center gap-1">
          Windows
          {hasWindows && (
            <span className="ml-1 text-[10px] font-semibold text-muted-foreground/60">
              {windows.length}
            </span>
          )}
        </span>
      </button>

      {/* ── Menu portal — escapes sidebar overflow/transform ─────────────── */}
      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[10000] flex flex-col",
              "w-[260px] min-h-[380px] rounded-xl overflow-hidden",
              "bg-card/97 backdrop-blur-xl border border-border shadow-2xl",
              "py-1 text-sm",
            )}
            style={{ left: pos.x, bottom: pos.bottom }}
          >
            {/* ── Tabs Header ──────────────────────────────────────────────── */}
            <div className="flex items-center px-2 py-1 mb-1 border-b border-border/50 gap-1 overflow-x-auto">
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors",
                  activeTab === "tools"
                    ? "bg-accent/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
                onClick={() => setActiveTab("tools")}
              >
                Tools
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors",
                  activeTab === "visibility"
                    ? "bg-accent/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
                onClick={() => setActiveTab("visibility")}
              >
                Visibility
              </button>
              <button
                type="button"
                className={cn(
                  "px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md transition-colors",
                  activeTab === "layout"
                    ? "bg-accent/80 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                )}
                onClick={() => setActiveTab("layout")}
              >
                Layout
              </button>
            </div>

            {/* ── Tab Content: Visibility ──────────────────────────────────── */}
            {activeTab === "visibility" && (
              <div className="flex-1 flex flex-col">
                <MenuItem
                  icon={
                    hidden ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )
                  }
                  label={hidden ? "Show All Windows" : "Hide All Windows"}
                  description={
                    hidden
                      ? "Make all windows visible again"
                      : "Keep windows running, hide from view"
                  }
                  onClick={() => act(() => dispatch(toggleWindowsHidden()))}
                  disabled={!hasWindows}
                />

                {/* ── Per-window list ───────────────────────────────────────────── */}
                {hasWindows ? (
                  <>
                    <MenuDivider />
                    <MenuSection label="Windows" />
                    <div className="max-h-60 overflow-y-auto">
                      {windows.map((win) => (
                        <button
                          key={win.id}
                          type="button"
                          role="menuitem"
                          className="flex items-center gap-2.5 w-full px-3 py-1.5 hover:bg-accent transition-colors text-left text-foreground/80"
                          onClick={() =>
                            act(() => {
                              if (win.state === "minimized")
                                dispatch(restoreWindow(win.id));
                              dispatch(focusWindow(win.id));
                              if (hidden) dispatch(toggleWindowsHidden());
                            })
                          }
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              STATE_DOT[win.state],
                            )}
                            title={STATE_LABEL[win.state]}
                          />
                          <span className="flex-1 truncate text-xs font-medium">
                            {win.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0">
                            {STATE_LABEL[win.state]}
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="px-3 py-2 text-xs text-muted-foreground/50 italic">
                    No windows open
                  </p>
                )}
                <div className="mt-auto">
                  <MenuDivider />
                  <MenuSection label="Window Controls" />
                  <MenuItem
                    icon={<Minimize2 className="w-3.5 h-3.5" />}
                    label="Minimize All"
                    description="Collapse all open windows to the tray"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          minimizeAll({
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                          }),
                        ),
                      )
                    }
                    disabled={!hasWindows || allMinimized}
                  />
                  <MenuItem
                    icon={<Maximize2 className="w-3.5 h-3.5" />}
                    label="Restore All"
                    description="Return all windows to their last size"
                    onClick={() => act(() => dispatch(restoreAll()))}
                    disabled={!hasWindows || !allMinimized}
                  />
                </div>
              </div>
            )}

            {/* ── Tab Content: Layout ──────────────────────────────────────── */}
            {activeTab === "layout" && (
              <div className="flex-1 flex flex-col">
                <MenuSection label="Progression" />
                <div className="flex justify-center items-center gap-1.5 px-2 py-1.5 bg-accent/30 rounded-md mx-2 mb-2">
                  <button
                    onClick={() =>
                      setLayoutDirX((d) => (d === "ltr" ? "rtl" : "ltr"))
                    }
                    className="flex-1 flex justify-center items-center gap-1 py-1 rounded transition-colors bg-card hover:bg-accent border border-border/50 text-foreground shadow-sm"
                    title="Toggle Horizontal Progression"
                  >
                    {layoutDirX === "rtl" ? (
                      <ArrowLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] font-medium leading-none tracking-wide">
                      {layoutDirX === "rtl" ? "R→L" : "L→R"}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setLayoutDirY((d) => (d === "ttb" ? "btt" : "ttb"))
                    }
                    className="flex-1 flex justify-center items-center gap-1 py-1 rounded transition-colors bg-card hover:bg-accent border border-border/50 text-foreground shadow-sm"
                    title="Toggle Vertical Progression"
                  >
                    {layoutDirY === "btt" ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] font-medium leading-none tracking-wide">
                      {layoutDirY === "btt" ? "B↑T" : "T↓B"}
                    </span>
                  </button>
                  <button
                    onClick={() =>
                      setLayoutPrimary((p) =>
                        p === "horizontal" ? "vertical" : "horizontal",
                      )
                    }
                    className="flex-1 flex justify-center items-center gap-1 py-1 rounded transition-colors bg-card hover:bg-accent border border-border/50 text-foreground shadow-sm"
                    title="Toggle Primary Flow Direction"
                  >
                    {layoutPrimary === "horizontal" ? (
                      <Rows3 className="w-3.5 h-3.5" />
                    ) : (
                      <Columns3 className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] font-medium leading-none tracking-wide">
                      {layoutPrimary === "horizontal" ? "HORZ" : "VERT"}
                    </span>
                  </button>
                </div>

                <MenuSection label="Arrange All" />
                <div className="flex flex-col gap-1 px-2 pb-2">
                  <div className="flex gap-1 justify-center">
                    <LayoutIconButton
                      type="grid4"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "grid4",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="grid6"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "grid6",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="grid8"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "grid8",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="grid9"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "grid9",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="grid12"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "grid12",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex gap-1 justify-center">
                    <LayoutIconButton
                      type="stackRight2"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackRight2",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackRight3"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackRight3",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackRight4"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackRight4",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackRight5"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackRight5",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                  </div>
                  <div className="flex gap-1 justify-center">
                    <LayoutIconButton
                      type="stackLeft2"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackLeft2",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackLeft3"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackLeft3",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackLeft4"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackLeft4",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                    <LayoutIconButton
                      type="stackLeft5"
                      onClick={() =>
                        dispatch(
                          arrangeActiveWindows({
                            layout: "stackLeft5",
                            viewportWidth: window.innerWidth,
                            viewportHeight: window.innerHeight,
                            dirX: layoutDirX,
                            dirY: layoutDirY,
                            primary: layoutPrimary,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab Content: Tools ───────────────────────────────────────── */}
            {activeTab === "tools" && (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <MenuSection label="System Tools" />
                <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 mt-1">
                  <MenuGridItem
                    icon={<FileJson className="w-3.5 h-3.5" />}
                    label="JSON Truncator"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "jsonTruncator" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<StickyNote className="w-3.5 h-3.5" />}
                    label="Notes"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "notesWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Mic className="w-3.5 h-3.5" />}
                    label="AI Voice"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "aiVoiceWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Wand2 className="w-3.5 h-3.5" />}
                    label="AI Results"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "quickAIResults" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Bug className="w-3.5 h-3.5" />}
                    label="Stream Debug"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({
                            overlayId: "streamDebug",
                            data: { conversationId: "default" },
                          }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<MessageSquare className="w-3.5 h-3.5" />}
                    label="Feedback"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "feedbackDialog" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Activity className="w-3.5 h-3.5" />}
                    label="State Analyzer"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({
                            overlayId: "adminStateAnalyzerWindow",
                          }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<FileCode2 className="w-3.5 h-3.5" />}
                    label="Markdown"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({
                            overlayId: "markdownEditorWindow",
                            data: { instanceId: "default" },
                          }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Settings className="w-3.5 h-3.5" />}
                    label="Preferences"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "userPreferencesWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Mail className="w-3.5 h-3.5" />}
                    label="Email"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "emailDialogWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Share2 className="w-3.5 h-3.5" />}
                    label="Share Modal"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({
                            overlayId: "shareModalWindow",
                            data: { resourceType: "note" },
                          }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<CheckSquare className="w-3.5 h-3.5" />}
                    label="Tasks"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "quickTasksWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Database className="w-3.5 h-3.5" />}
                    label="Data Tables"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "quickDataWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<FolderSearch className="w-3.5 h-3.5" />}
                    label="Files"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "quickFilesWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<ArrowUp className="w-3.5 h-3.5" />}
                    label="Upload"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "fileUploadWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Globe className="w-3.5 h-3.5" />}
                    label="Web Scraper"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "scraperWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Layers className="w-3.5 h-3.5" />}
                    label="Context Switcher"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "contextSwitcherWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<FileScan className="w-3.5 h-3.5" />}
                    label="PDF Extractor"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "pdfExtractorWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<MonitorPlay className="w-3.5 h-3.5" />}
                    label="Canvas Viewer"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "canvasViewerWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Newspaper className="w-3.5 h-3.5" />}
                    label="News"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "newsWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<ListFilter className="w-3.5 h-3.5" />}
                    label="List Manager"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "listManagerWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<GalleryHorizontalEnd className="w-3.5 h-3.5" />}
                    label="Gallery"
                    onClick={() =>
                      act(() =>
                        dispatch(openOverlay({ overlayId: "galleryWindow" })),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                    label="Agent Settings"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({ overlayId: "agentSettingsWindow" }),
                        ),
                      )
                    }
                  />
                  <MenuGridItem
                    icon={<Cpu className="w-3.5 h-3.5" />}
                    label="Exec Inspector"
                    onClick={() =>
                      act(() =>
                        dispatch(
                          openOverlay({
                            overlayId: "executionInspectorWindow",
                          }),
                        ),
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─── Menu primitives ──────────────────────────────────────────────────────────

function MenuSection({ label }: { label: string }) {
  return (
    <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
      {label}
    </div>
  );
}

function MenuDivider() {
  return <div className="border-t border-border/50 my-1" />;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}

function MenuItem({
  icon,
  label,
  description,
  onClick,
  disabled,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex items-start gap-2.5 w-full px-3 py-1.5 transition-colors text-left",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-accent cursor-pointer text-foreground/80",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-xs font-medium leading-tight">{label}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function MenuGridItem({
  icon,
  label,
  onClick,
  disabled,
}: Omit<MenuItemProps, "description">) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex items-center justify-start gap-1.5 px-1 py-3 transition-colors text-left border rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        disabled
          ? "opacity-40 cursor-not-allowed border-border/20 bg-background/50"
          : "cursor-pointer border-border/40 bg-card hover:bg-accent hover:border-border/60 hover:shadow-md text-foreground/80",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={label}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-[11px] font-medium leading-none truncate max-w-full">
        {label}
      </span>
    </button>
  );
}
