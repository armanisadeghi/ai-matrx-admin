/**
 * app/(a)/image-manager/_components/ImageManagerPageShell.tsx
 *
 * Client shell for `/image-manager`. Sidebar layout with a registry-driven
 * section list — adding a new tab is a one-line entry in `SECTIONS`.
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  FolderTree,
  ImageIcon,
  Sparkles,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveGallery } from "@/components/image/ResponsiveGallery";
import { ImagePreviewRow } from "@/components/image/shared/ImagePreviewRow";
import { CloudImagesTab } from "@/components/image/cloud/CloudImagesTab";
import { CloudFilesTab } from "@/components/image/cloud/CloudFilesTab";
import { CloudUploadTab } from "@/components/image/cloud/CloudUploadTab";
import { ImageStudioTab } from "@/components/image/cloud/ImageStudioTab";
import { useSelectedImages } from "@/components/image/context/SelectedImagesProvider";

// ---------------------------------------------------------------------------
// Section registry. Add a new tab by appending one entry — `id`, `label`,
// `icon`, and a `render` function. No other file needs to change.
// ---------------------------------------------------------------------------

interface SectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind text-color class for the icon (gives the sidebar visual lift). */
  iconColor: string;
  render: () => React.ReactNode;
}

const SECTIONS: SectionDefinition[] = [
  {
    id: "public-search",
    label: "Public Images",
    icon: ImageIcon,
    iconColor: "text-sky-500",
    render: () => (
      <div className="h-full overflow-auto p-4">
        <ResponsiveGallery type="unsplash" />
      </div>
    ),
  },
  {
    id: "my-images",
    label: "Your Cloud",
    icon: Cloud,
    iconColor: "text-violet-500",
    render: () => <CloudImagesTab />,
  },
  {
    id: "my-files",
    label: "All Files",
    icon: FolderTree,
    iconColor: "text-amber-500",
    render: () => <CloudFilesTab allowFileTypes={["any"]} />,
  },
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    iconColor: "text-emerald-500",
    render: () => <CloudUploadTab />,
  },
  {
    id: "image-studio",
    label: "Image Studio",
    icon: Wand2,
    iconColor: "text-fuchsia-500",
    render: () => <ImageStudioTab />,
  },
  {
    id: "ai-generate",
    label: "AI Generate",
    icon: Sparkles,
    iconColor: "text-rose-500",
    render: () => <AIGenerateHero />,
  },
];

const STORAGE_KEY = "image-manager:active-section";
const DEFAULT_SECTION_ID = "my-images";

export function ImageManagerPageShell() {
  const [activeId, setActiveId] = useState<string>(DEFAULT_SECTION_ID);
  const { selectedImages, selectionMode, setSelectionMode, clearImages } =
    useSelectedImages();

  // Default to "Your Cloud" but remember the user's last choice.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SECTIONS.some((s) => s.id === stored)) {
        setActiveId(stored);
      }
    } catch {
      /* private mode etc. */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  // Multiple selection by default — feels right for a manage-your-library
  // surface. Browse-vs-Select toggle is on the roadmap (see route docs).
  useEffect(() => {
    if (selectionMode === "none") {
      setSelectionMode("multiple");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSection = useMemo(
    () => SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0],
    [activeId],
  );

  return (
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
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeId;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveId(section.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors border-l-2",
                  isActive
                    ? "bg-primary/10 text-primary border-l-primary font-medium"
                    : "border-l-transparent text-foreground hover:bg-accent/50",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive ? "text-primary" : section.iconColor,
                  )}
                />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <SidebarFooter
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
  );
}

// ---------------------------------------------------------------------------
// Sidebar footer — selection mode toggle + counter.
// ---------------------------------------------------------------------------

function SidebarFooter({
  selectionCount,
  selectionMode,
  onChangeMode,
  onClearSelection,
}: {
  selectionCount: number;
  selectionMode: "single" | "multiple" | "none";
  onChangeMode: (mode: "single" | "multiple" | "none") => void;
  onClearSelection: () => void;
}) {
  return (
    <div className="border-t border-border px-2.5 py-2 space-y-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        Selection
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onChangeMode("single")}
          className={cn(
            "h-6 rounded text-[11px] font-medium transition-colors",
            selectionMode === "single"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-accent",
          )}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => onChangeMode("multiple")}
          className={cn(
            "h-6 rounded text-[11px] font-medium transition-colors",
            selectionMode === "multiple"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-accent",
          )}
        >
          Multi
        </button>
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

// ---------------------------------------------------------------------------
// AI Generate placeholder — scoped here so the route doesn't depend on
// the modal exporting a sub-piece.
// ---------------------------------------------------------------------------

function AIGenerateHero() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          AI Image Generation
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming soon — describe an image in plain English and have it appear in
          your cloud, ready to use.
        </p>
      </div>
    </div>
  );
}
