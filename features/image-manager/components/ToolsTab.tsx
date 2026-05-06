"use client";

/**
 * features/image-manager/components/ToolsTab.tsx
 *
 * Secondary "Tools" landing inside the Image Manager hub. Surfaces the
 * smaller image-related utilities scattered across the codebase so they
 * stop being unfindable. Each card either:
 *   • opens an external route in a new tab (Studio Presets, Photos view),
 *   • opens a floating window via the overlay system (Lightbox, Gallery),
 *   • runs an inline action (Screenshot), or
 *   • expands an inline tool (Crop) within this same tab.
 *
 * Adding a new tool: append a `ToolDescriptor` to the `TOOLS` array
 * below. No other file needs to change.
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  Camera,
  Crop as CropIcon,
  CloudUpload,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Layers,
  MousePointer,
  Smile,
  type LucideIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { openImageViewer } from "@/features/window-panels/windows/image/ImageViewerWindow";
import { useSelectedImages } from "@/components/image/context/SelectedImagesProvider";
import { useScreenshot } from "@/hooks/useScreenshot";
import ImageCropperWithSelect from "@/components/official/image-cropper/ImageCropperWithSelect";
import { toast } from "sonner";

interface ToolDescriptor {
  id: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  description: string;
  /** Render the action button — the click handler is whatever the tool needs. */
  action: ToolAction;
  /** When provided, expanding the tool reveals an inline body inside this tab. */
  expand?: () => React.ReactNode;
}

type ToolAction =
  | { kind: "expand"; label: string }
  | { kind: "openOverlay"; label: string; overlayId: string }
  | { kind: "openLink"; label: string; href: string; external?: boolean }
  | { kind: "callback"; label: string; run: () => void | Promise<void> };

export function ToolsTab() {
  const dispatch = useAppDispatch();
  const { selectedImages } = useSelectedImages();
  const screenshot = useScreenshot({ autoCompress: true });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLightbox = () => {
    if (selectedImages.length === 0) {
      toast.info(
        "Select an image first — Lightbox plays back what's in your selection.",
      );
      return;
    }
    openImageViewer(dispatch, {
      images: selectedImages.map((img) => img.url),
      alts: selectedImages.map(
        (img) =>
          (img.metadata?.title as string | undefined) ??
          (img.metadata?.description as string | undefined) ??
          img.id,
      ),
      title: "Selection viewer",
    });
  };

  const handleScreenshot = async () => {
    try {
      const result = await screenshot.captureScreen();
      if (!result) {
        toast.error("Couldn't capture the screen");
        return;
      }
      // Open immediately in the floating viewer for review.
      openImageViewer(dispatch, {
        images: [result.dataUrl],
        title: "Screenshot",
      });
      toast.success("Screenshot ready — opened in the viewer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Screenshot failed";
      toast.error(message);
    }
  };

  const tools: ToolDescriptor[] = [
    {
      id: "crop",
      label: "Crop",
      icon: CropIcon,
      iconColor: "text-fuchsia-500",
      description:
        "Pick an image, drag a crop rectangle, get a cropped data URL back. Inline tool — no extra window.",
      action: { kind: "expand", label: "Open" },
      expand: () => <InlineCropTool />,
    },
    {
      id: "crop-studio",
      label: "Crop Studio",
      icon: CloudUpload,
      iconColor: "text-indigo-500",
      description:
        "Drop one or many images, give each its own tab, then crop them individually or apply one rectangle to all. Saves the cropped output to the cloud folder you pick.",
      action: {
        kind: "openOverlay",
        label: "Open Studio",
        overlayId: "cropStudioWindow",
      },
    },
    {
      id: "lightbox",
      label: "Lightbox",
      icon: Eye,
      iconColor: "text-sky-500",
      description:
        "Open every image in your current selection in the floating viewer. Zoom, pan, page through, download.",
      action: {
        kind: "callback",
        label: "Play selection",
        run: handleLightbox,
      },
    },
    {
      id: "gallery",
      label: "Floating Gallery",
      icon: Layers,
      iconColor: "text-emerald-500",
      description:
        "Pop a free-floating Unsplash gallery so you can keep browsing while another tab is in focus.",
      action: {
        kind: "openOverlay",
        label: "Open gallery",
        overlayId: "galleryWindow",
      },
    },
    {
      id: "screenshot",
      label: "Screenshot",
      icon: Camera,
      iconColor: "text-amber-500",
      description:
        "Capture the current viewport (excluding panels marked `data-screenshot-exclude`). Useful for bug reports and feedback.",
      action: {
        kind: "callback",
        label: "Capture",
        run: handleScreenshot,
      },
    },
    {
      id: "presets",
      label: "Presets reference",
      icon: ImageIcon,
      iconColor: "text-violet-500",
      description:
        "Read-only catalog of every Image Studio preset (60+ across 10 categories) — perfect for picking the right export size.",
      action: {
        kind: "openLink",
        label: "Open catalog",
        href: "/image-studio/presets",
        external: true,
      },
    },
    {
      id: "photos",
      label: "Photos view",
      icon: ImageIcon,
      iconColor: "text-rose-500",
      description:
        "Image-MIME filtered view of your full cloud-files tree — better for managing photos than the All Files tab.",
      action: {
        kind: "openLink",
        label: "Open Photos",
        href: "/files/photos",
        external: true,
      },
    },
    {
      id: "compact-picker",
      label: "Compact picker",
      icon: MousePointer,
      iconColor: "text-cyan-500",
      description:
        "Reference for the form-helper components: <SingleImageSelect>, <ImageManagerRow>, <ImageManagerIcon>. Use these to pull the Image Manager into your own UI.",
      action: {
        kind: "openLink",
        label: "View demos",
        href: "/admin/official-components",
        external: true,
      },
    },
    {
      id: "favicons",
      label: "Favicons",
      icon: Smile,
      iconColor: "text-pink-500",
      description:
        "Every agent app and prompt app gets a procedurally-generated, colored, letter-based favicon via /api/agent-apps/generate-favicon. Runs at app-create time — this card is the entry point for that flow's docs.",
      action: {
        kind: "openLink",
        label: "Read docs",
        href: "/admin/official-components",
        external: true,
      },
    },
  ];

  const expanded = expandedId
    ? (tools.find((t) => t.id === expandedId) ?? null)
    : null;

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {expanded?.expand ? (
        <section className="rounded-lg border border-primary/30 bg-card overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <expanded.icon className={cn("h-4 w-4", expanded.iconColor)} />
              {expanded.label}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpandedId(null)}
              aria-label="Close tool"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </header>
          <div className="p-3">{expanded.expand()}</div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            isExpanded={expandedId === tool.id}
            onAction={() => {
              switch (tool.action.kind) {
                case "expand":
                  setExpandedId((id) => (id === tool.id ? null : tool.id));
                  break;
                case "openOverlay":
                  dispatch(
                    openOverlay({
                      overlayId: tool.action.overlayId,
                      instanceId: "default",
                    }),
                  );
                  break;
                case "callback":
                  void tool.action.run();
                  break;
                case "openLink":
                  // External links handled by the <Link> in the card itself.
                  break;
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool card — handles each action kind's affordance.
// ---------------------------------------------------------------------------

function ToolCard({
  tool,
  isExpanded,
  onAction,
}: {
  tool: ToolDescriptor;
  isExpanded: boolean;
  onAction: () => void;
}) {
  const Icon = tool.icon;
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className={cn("h-4 w-4", tool.iconColor)} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{tool.label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {tool.description}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-1">
        {tool.action.kind === "openLink" ? (
          <Link
            href={tool.action.href}
            target={tool.action.external ? "_blank" : undefined}
            rel={tool.action.external ? "noreferrer" : undefined}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            {tool.action.label}
            {tool.action.external ? (
              <ExternalLink className="h-3 w-3 opacity-60" />
            ) : null}
          </Link>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={isExpanded ? "default" : "outline"}
            onClick={onAction}
          >
            {isExpanded && tool.action.kind === "expand"
              ? "Close"
              : tool.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Crop tool — composes the official `<ImageCropperWithSelect>`.
// On crop completion the result data URL is added to the selection so it
// flows through the rest of the hub.
// ---------------------------------------------------------------------------

function InlineCropTool() {
  const { addImage } = useSelectedImages();
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  const handleComplete = (url: string) => {
    setCroppedUrl(url);
    addImage({
      type: "local",
      url,
      id: `cropped:${Date.now()}`,
      metadata: {
        title: "Cropped image",
        description: "Crop output (in-memory data URL — save it to keep it).",
      },
    });
    toast.success("Crop added to selection — save it from the footer to keep.");
  };

  return (
    <div className="space-y-3">
      <ImageCropperWithSelect onComplete={handleComplete} />
      {croppedUrl ? (
        <div className="text-xs text-muted-foreground">
          Crop result added to your selection. To persist it, switch to the
          Upload tab and drop the data URL — or wire this tool to{" "}
          <Link
            href="/image-studio/from-base64"
            className="text-primary hover:underline"
            target="_blank"
          >
            from-base64
          </Link>{" "}
          for a one-step save.
        </div>
      ) : null}
    </div>
  );
}
