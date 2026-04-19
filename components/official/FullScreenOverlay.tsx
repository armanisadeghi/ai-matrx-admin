"use client";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabDefinition {
  id: string;
  label: string;
  content: ReactNode;
  className?: string;
}

export interface FullScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  tabs: TabDefinition[];
  initialTab?: string;
  onTabChange?: (newTab: string) => void;
  footerContent?: ReactNode;
  showSaveButton?: boolean;
  onSave?: () => void;
  saveButtonLabel?: string;
  saveButtonDisabled?: boolean;
  showCancelButton?: boolean;
  onCancel?: () => void;
  cancelButtonLabel?: string;
  additionalButtons?: ReactNode;
  width?: string;
  height?: string;
  // New optional props for split view
  sidePanel?: ReactNode;
  sidePanelRatio?: number; // value between 0-1, defaults to 0.5 (50/50 split)
  sidePanelClassName?: string;
  // New optional props for left side panel
  leftSidePanel?: ReactNode;
  leftSidePanelRatio?: number; // value between 0-1, defaults to 0.15 (15% width)
  leftSidePanelClassName?: string;
  // New optional prop for shared header above all tabs content
  sharedHeader?: ReactNode;
  sharedHeaderClassName?: string;
  // Hide the title visually (keeps it for screen readers)
  hideTitle?: boolean;
  // Render tabs as a compact rectangular button-group instead of the default pill style
  compactTabs?: boolean;
  // When set, the tab bar hides this tab from the button row and shows a left
  // chevron that navigates back to it (used for a "Tab Index" landing tab).
  homeTabId?: string;
}

const ScrollableTabBar = ({
  tabs,
  activeTab,
  onTabChange,
  compact,
  homeTabId,
}: {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (id: string) => void;
  compact: boolean;
  homeTabId?: string;
}) => {
  const showChevron = homeTabId && activeTab !== homeTabId;
  const visibleTabs = homeTabId ? tabs.filter((t) => t.id !== homeTabId) : tabs;

  return (
    <div className="inline-flex flex-row items-center gap-0">
      {showChevron && (
        <button
          type="button"
          onClick={() => onTabChange(homeTabId)}
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md mr-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Back to Tab Index"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="inline-flex flex-row overflow-x-auto scrollbar-none gap-0 rounded-md bg-transparent border-2 border-border">
        {visibleTabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isNotLast = index < visibleTabs.length - 1;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap text-xs px-2 py-0.5 h-6 cursor-pointer transition-colors",
                isNotLast && "border-r border-border",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-50 dark:bg-gray-800 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
  isOpen,
  onClose,
  title,
  description,
  tabs,
  initialTab,
  onTabChange,
  footerContent,
  showSaveButton = false,
  onSave,
  saveButtonLabel = "Save",
  saveButtonDisabled = false,
  showCancelButton = false,
  onCancel,
  cancelButtonLabel = "Cancel",
  additionalButtons,
  width = "90vw",
  height = "95dvh",
  sidePanel,
  sidePanelRatio = 0.5,
  sidePanelClassName,
  leftSidePanel,
  leftSidePanelRatio = 0.1,
  leftSidePanelClassName,
  sharedHeader,
  sharedHeaderClassName,
  hideTitle = false,
  compactTabs = true,
  homeTabId,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>(
    initialTab || (tabs.length > 0 ? tabs[0].id : ""),
  );
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync activeTab when initialTab changes (e.g., reopening overlay with a different tab)
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track visual viewport height for keyboard handling on mobile
  // On real devices, the visual viewport shrinks when the keyboard opens.
  // Using visualViewport.height instead of dvh/vh ensures the overlay
  // never extends behind the keyboard or beyond reachable screen area.
  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    // Initial measurement
    updateHeight();

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
    }
    // Fallback for browsers without visualViewport
    window.addEventListener("resize", updateHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateHeight);
        window.visualViewport.removeEventListener("scroll", updateHeight);
      }
      window.removeEventListener("resize", updateHeight);
    };
  }, [isMobile]);

  // When keyboard opens, scroll the focused input into view within the overlay
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        // Allow the keyboard to fully appear before scrolling
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [isMobile, isOpen]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (onTabChange) {
      onTabChange(newTab);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  // Calculate the width percentages based on ratio (desktop only)
  const rightSidePanelWidth = sidePanel && !isMobile ? sidePanelRatio * 100 : 0;
  const leftSidePanelWidth =
    leftSidePanel && !isMobile ? leftSidePanelRatio * 100 : 0;
  const contentWidth = 100 - rightSidePanelWidth - leftSidePanelWidth;

  // On mobile, use visualViewport height (pixel-accurate even with keyboard)
  // to guarantee the overlay fits within reachable screen area.
  // Position is handled by Tailwind classes (!top-0 !left-0 !translate-x/y-0)
  // to properly override the base DialogContent centering transform.
  const mobileStyle = isMobile
    ? {
        height: viewportHeight ? `${viewportHeight}px` : "100dvh",
        maxHeight: viewportHeight ? `${viewportHeight}px` : "100dvh",
      }
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0 bg-background border-solid",
          isMobile
            ? "!fixed !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 w-full max-w-full rounded-none border-2 border-border"
            : "rounded-3xl border-2 border-border",
        )}
        style={
          isMobile
            ? mobileStyle
            : { width, maxWidth: width, height, maxHeight: height }
        }
      >
        {/* Header — explicit width:100% so calc() children have a reference point.
            DialogTitle is required for a11y; DialogDescription stays sr-only. */}
        <DialogHeader
          className={cn("w-full pl-2 pr-10", isMobile ? "pt-safe" : "")}
        >
          <div
            className={cn(
              "flex flex-row items-center pr-10",
              isMobile ? "px-2 pt-2 pb-1" : "px-4 pt-2.5 pb-0",
            )}
          >
            <DialogTitle
              className={cn(
                "shrink-0",
                isMobile ? "text-base font-semibold" : "text-sm",
                hideTitle && "sr-only",
              )}
            >
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {description ?? title}
            </DialogDescription>
          </div>

          <div className="max-w-full overflow-y-hidden pb-2">
            <div className="inline-flex items-center">
              <ScrollableTabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                compact={compactTabs}
                homeTabId={homeTabId}
              />
            </div>
          </div>
        </DialogHeader>

        {sharedHeader && (
          <div
            className={cn(
              "border-b py-2 flex-shrink-0",
              isMobile ? "px-2" : "px-4",
              sharedHeaderClassName,
            )}
          >
            {sharedHeader}
          </div>
        )}

        <div
          ref={contentRef}
          className={cn(
            "flex flex-1 overflow-hidden min-h-0",
            isMobile ? "flex-col" : "flex-row",
          )}
        >
          {leftSidePanel && !isMobile && (
            <div
              className={cn("border-r overflow-auto", leftSidePanelClassName)}
              style={{ width: `${leftSidePanelWidth}%` }}
            >
              {leftSidePanel}
            </div>
          )}

          <div
            className="flex flex-col overflow-hidden min-h-0 "
            style={
              !isMobile ? { width: `${contentWidth}%` } : { width: "100%" }
            }
          >
            <Tabs
              value={activeTab}
              className="flex-grow flex flex-col overflow-hidden min-h-0 border border-border"
            >
              {tabs.map((tab) => (
                <TabsContent
                  key={`content-${tab.id}`}
                  value={tab.id}
                  className={cn(
                    "flex-grow mt-0 border-none overflow-auto outline-none ring-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col",
                    isMobile ? "px-0" : "",
                    tab.className,
                  )}
                >
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {sidePanel && !isMobile && (
            <div
              className={cn("border-l overflow-auto", sidePanelClassName)}
              style={{ width: `${rightSidePanelWidth}%` }}
            >
              {sidePanel}
            </div>
          )}
        </div>

        {(showSaveButton ||
          showCancelButton ||
          additionalButtons ||
          footerContent) && (
          <DialogFooter
            className={cn(
              "border-t flex-shrink-0",
              isMobile
                ? "flex flex-row items-center justify-between gap-1 p-1.5 pb-safe"
                : "flex items-center justify-end p-1 pr-3",
            )}
          >
            {additionalButtons && (
              <div
                className={cn(
                  "flex items-center gap-1",
                  isMobile ? "shrink-0" : "mr-1 gap-2",
                )}
              >
                {additionalButtons}
              </div>
            )}
            {footerContent}
            <div
              className={cn(
                "flex items-center",
                isMobile ? "gap-1 shrink-0" : "gap-2",
              )}
            >
              {showCancelButton &&
                (isMobile ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCancel}
                    aria-label={cancelButtonLabel}
                    title={cancelButtonLabel}
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleCancel}>
                    {cancelButtonLabel}
                  </Button>
                ))}
              {showSaveButton &&
                (isMobile ? (
                  <Button
                    size="icon"
                    onClick={handleSave}
                    disabled={saveButtonDisabled}
                    aria-label={saveButtonLabel}
                    title={saveButtonLabel}
                    className="h-9 w-9"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saveButtonDisabled}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveButtonLabel}
                  </Button>
                ))}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenOverlay;
