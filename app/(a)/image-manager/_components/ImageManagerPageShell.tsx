"use client";

/**
 * app/(a)/image-manager/_components/ImageManagerPageShell.tsx
 *
 * Client shell for `/image-manager`.
 *
 * Sidebar layout driven by the shared section registry
 * (`features/image-manager/registry/sections.ts`). Adding a new tab is a
 * one-line entry there — neither this file nor the modal needs to change.
 *
 * Mounts `<BrowseImageProvider>` so the tabs that opt-in to
 * `useBrowseAction()` can open the floating image viewer in Browse mode.
 *
 * Mobile (`useIsMobile()`): the sidebar collapses into a Drawer-style
 * bottom sheet so we never render two scrollable columns on a phone.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Menu,
  MousePointer2,
  Eye,
  CopyCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ImagePreviewRow } from "@/components/image/shared/ImagePreviewRow";
import { useSelectedImages } from "@/components/image/context/SelectedImagesProvider";
import { BrowseImageProvider } from "@/features/image-manager/browse/BrowseImageProvider";
import {
  buildImageManagerSections,
  SECTION_IDS,
} from "@/features/image-manager/registry/sections";
import type { SectionDefinition } from "@/features/image-manager/registry/types";

const STORAGE_KEY_SECTION = "image-manager:active-section";
const STORAGE_KEY_MODE = "image-manager:selection-mode";
const DEFAULT_SECTION_ID: string = SECTION_IDS.myImages;

type SelectionMode = "single" | "multiple" | "none";

export function ImageManagerPageShell() {
  const sections = useMemo(
    () =>
      buildImageManagerSections({
        variant: "route",
        showImageStudio: true,
        showAIGenerate: true,
        showTools: true,
      }),
    [],
  );

  const [activeId, setActiveId] = useState<string>(DEFAULT_SECTION_ID);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  const { selectedImages, selectionMode, setSelectionMode, clearImages } =
    useSelectedImages();

  // ─── Persist active section ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_SECTION);
      if (stored && sections.some((s) => s.id === stored)) {
        setActiveId(stored);
      }
    } catch {
      /* private mode etc. */
    }
  }, [sections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_SECTION, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  // ─── Persist selection mode (3-way: browse / single / multiple) ─────
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_MODE);
      if (stored === "single" || stored === "multiple" || stored === "none") {
        setSelectionMode(stored);
        return;
      }
    } catch {
      /* ignore */
    }
    // First visit — default to "multiple" (managing-a-library feel).
    if (selectionMode === "none") setSelectionMode("multiple");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_MODE, selectionMode);
    } catch {
      /* ignore */
    }
  }, [selectionMode]);

  const activeSection = useMemo<SectionDefinition>(
    () => sections.find((s) => s.id === activeId) ?? sections[0],
    [sections, activeId],
  );

  // ─── Mobile: render via Drawer for nav, single column for body ──────
  if (isMobile) {
    return (
      <BrowseImageProvider>
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
          <header className="border-b border-border bg-card/40 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open Image Manager menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <activeSection.icon
              className={cn("h-4 w-4 flex-shrink-0", activeSection.iconColor)}
            />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {activeSection.label}
            </h2>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeSection.render()}
          </div>

          {selectedImages.length > 0 ? (
            <footer className="border-t border-border bg-card/40 px-4 py-2 flex items-center gap-3 flex-shrink-0 pb-safe">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {selectedImages.length} selected
              </span>
              <div className="flex-1 min-w-0">
                <ImagePreviewRow size="s" showRemoveButton />
              </div>
            </footer>
          ) : null}

          <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <DrawerContent className="px-2 pb-safe">
              <DrawerTitle className="px-3 pt-3 pb-1 text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Image Manager
              </DrawerTitle>

              <nav
                className="overflow-y-auto py-1"
                aria-label="Image Manager sections"
              >
                {sections.map((section) =>
                  renderNavItem(
                    section,
                    section.id === activeId,
                    () => {
                      setActiveId(section.id);
                      setMobileNavOpen(false);
                    },
                    /* dense */ false,
                  ),
                )}
              </nav>

              <SelectionModeStrip
                selectionCount={selectedImages.length}
                selectionMode={selectionMode}
                onChangeMode={setSelectionMode}
                onClearSelection={clearImages}
                className="mt-2 border-t border-border pt-2"
              />
            </DrawerContent>
          </Drawer>
        </div>
      </BrowseImageProvider>
    );
  }

  // ─── Desktop ────────────────────────────────────────────────────────
  return (
    <BrowseImageProvider>
      <div className="h-[calc(100dvh-var(--header-height))] flex overflow-hidden bg-textured">
        <aside className="w-44 flex-shrink-0 border-r border-border bg-card/40 flex flex-col">
          <div className="px-3 py-2.5 border-b border-border">
            <h1 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Image Manager
            </h1>
          </div>

          <nav
            className="flex-1 overflow-y-auto py-1"
            aria-label="Image Manager sections"
          >
            {sections.map((section) =>
              renderNavItem(
                section,
                section.id === activeId,
                () => setActiveId(section.id),
                /* dense */ true,
              ),
            )}
          </nav>

          <SelectionModeStrip
            selectionCount={selectedImages.length}
            selectionMode={selectionMode}
            onChangeMode={setSelectionMode}
            onClearSelection={clearImages}
          />
        </aside>

        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <header className="border-b border-border bg-card/40 px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
            <activeSection.icon
              className={cn("h-4 w-4 flex-shrink-0", activeSection.iconColor)}
            />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {activeSection.label}
            </h2>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeSection.render()}
          </div>

          {selectedImages.length > 0 ? (
            <footer className="border-t border-border bg-card/40 px-4 py-2 flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {selectedImages.length} selected
              </span>
              <div className="flex-1 min-w-0">
                <ImagePreviewRow size="s" showRemoveButton />
              </div>
            </footer>
          ) : null}
        </main>
      </div>
    </BrowseImageProvider>
  );
}

// ---------------------------------------------------------------------------
// Sidebar nav item — shared between desktop sidebar and mobile drawer.
// ---------------------------------------------------------------------------

function renderNavItem(
  section: SectionDefinition,
  isActive: boolean,
  onClick: () => void,
  dense: boolean,
) {
  const Icon: LucideIcon = section.icon;
  return (
    <button
      key={section.id}
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "w-full flex items-center gap-2 text-left transition-colors border-l-2",
        dense ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        isActive
          ? "bg-primary/10 text-primary border-l-primary font-medium"
          : "border-l-transparent text-foreground hover:bg-accent/50",
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          dense ? "h-3.5 w-3.5" : "h-4 w-4",
          isActive ? "text-primary" : section.iconColor,
        )}
      />
      <span className="truncate">{section.label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 3-way selection-mode toggle. "Browse" disables selection and lets clicks
// fall through to the BrowseImageProvider (open floating viewer).
// ---------------------------------------------------------------------------

function SelectionModeStrip({
  selectionCount,
  selectionMode,
  onChangeMode,
  onClearSelection,
  className,
}: {
  selectionCount: number;
  selectionMode: SelectionMode;
  onChangeMode: (mode: SelectionMode) => void;
  onClearSelection: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn("border-t border-border px-2.5 py-2 space-y-1.5", className)}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Mode
      </div>
      <div className="grid grid-cols-3 gap-1">
        <ModeButton
          icon={Eye}
          label="Browse"
          active={selectionMode === "none"}
          onClick={() => onChangeMode("none")}
        />
        <ModeButton
          icon={MousePointer2}
          label="Single"
          active={selectionMode === "single"}
          onClick={() => onChangeMode("single")}
        />
        <ModeButton
          icon={CopyCheck}
          label="Multi"
          active={selectionMode === "multiple"}
          onClick={() => onChangeMode("multiple")}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {selectionCount} item{selectionCount === 1 ? "" : "s"}
        </span>
        {selectionCount > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="hover:text-foreground transition-colors"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={cn(
        "h-7 rounded text-[10px] font-medium transition-colors flex flex-col items-center justify-center gap-0",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-foreground hover:bg-accent",
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="leading-none">{label}</span>
    </button>
  );
}
