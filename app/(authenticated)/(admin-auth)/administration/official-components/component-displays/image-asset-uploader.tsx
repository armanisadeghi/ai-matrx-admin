"use client";

import React, { useState } from "react";
import { ComponentEntry } from "../parts/component-list";
import { ComponentDisplayWrapper } from "../component-usage";
import {
  ImageAssetUploader,
  type ImagePreset,
  type ImageUploaderResult,
} from "@/components/official/ImageAssetUploader";
import { useOpenImageUploaderWindow } from "@/features/window-panels/windows/image/useOpenImageUploaderWindow";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

const PRESETS: Array<{
  preset: ImagePreset;
  label: string;
  description: string;
}> = [
  {
    preset: "social",
    label: "Social",
    description:
      "1400² cover + 1200×630 OG + 400² thumb (podcasts, posts, articles)",
  },
  {
    preset: "cover",
    label: "Cover",
    description: "1200×630 only (link previews, OG-only)",
  },
  {
    preset: "avatar",
    label: "Avatar",
    description: "400 / 128 / 48 (profile photos, user icons)",
  },
  {
    preset: "logo",
    label: "Logo",
    description: "512 / 200 / 64 (org logos, app icons)",
  },
  {
    preset: "favicon",
    label: "Favicon",
    description: "192 / 64 (browser tab icons, small marks)",
  },
  {
    preset: "square",
    label: "Square",
    description: "1024² single square (gallery items, thumbnails)",
  },
];

export default function ImageAssetUploaderDisplay({
  component,
}: ComponentDisplayProps) {
  const [preset, setPreset] = useState<ImagePreset>("social");
  const [result, setResult] = useState<ImageUploaderResult | null>(null);
  const openWindow = useOpenImageUploaderWindow();

  const code = `import { ImageAssetUploader, type ImageUploaderResult } from '@/components/official/ImageAssetUploader';
import { useOpenImageUploaderWindow } from '@/features/window-panels/windows/image/useOpenImageUploaderWindow';

// ── Inline (embedded in a form) ──────────────────────────────────────────
<ImageAssetUploader
  preset="social"                    // "social" | "cover" | "avatar" | "logo" | "favicon" | "square"
  currentUrl={form.image_url}
  enableViewerAction                 // preview opens the shared image window panel
  onComplete={(result) => {
    if (!result) return clear();
    setForm({
      ...form,
      image_url: result.primary_url,
      og_image_url: result.og_image_url ?? null,
      thumbnail_url: result.thumbnail_url ?? null,
    });
  }}
/>

// ── As a floating window (imperative) ────────────────────────────────────
const openUploader = useOpenImageUploaderWindow();

openUploader({
  preset: "logo",
  title: "Upload organization logo",
  currentUrl: form.logoUrl,
  onUploaded: (e) => setLogoUrl(e.result.primary_url),
  onCleared:  () => setLogoUrl(""),
});

// Features
// - Server-side Sharp pipeline: all variants share one original, stay consistent
// - 6 presets covering every common image shape (social, logo, favicon, …)
// - Drag-drop, click, OR paste a public URL
// - Cloud-files backed uploads with configurable visibility + folder
// - Optional preview action opens uploaded variants in the shared image panel`;

  const handleOpenWindow = () => {
    openWindow({
      preset,
      title: `Upload ${preset} image`,
      description:
        "This opens as a floating, draggable window — try it anywhere in the app.",
      currentUrl: result?.primary_url ?? null,
      onUploaded: (e) => setResult(e.result),
      onCleared: () => setResult(null),
    });
  };

  if (!component) return null;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="Drag-and-drop image upload with server-side Sharp processing. One file in, every configured size out. Ships with six presets covering podcasts, OG images, avatars, logos, and favicons. The inline preview can open the uploaded variants in the shared image WindowPanel."
    >
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.preset}
              type="button"
              onClick={() => setPreset(p.preset)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                preset === p.preset
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {PRESETS.find((p) => p.preset === preset)?.description}
        </p>

        <div className="border border-border rounded-xl p-4 bg-muted/10">
          <ImageAssetUploader
            preset={preset}
            onComplete={setResult}
            currentUrl={result?.primary_url ?? null}
            currentVariants={result}
            enableViewerAction
            label={`${preset.charAt(0).toUpperCase()}${preset.slice(1)} image`}
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenWindow}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open as floating window
          </Button>
          {result && (
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Reset demo
            </button>
          )}
        </div>

        {result && (
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
            <p className="text-xs font-medium">Upload result</p>
            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </ComponentDisplayWrapper>
  );
}
