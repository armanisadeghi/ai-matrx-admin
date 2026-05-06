"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ImageSource } from "@/features/image-studio/modes/shared/types";
import { ModeImagePicker } from "../_shared/ModeImagePicker";

const EditModeShell = dynamic(
  () =>
    import("@/features/image-studio/modes/edit/EditModeShell").then((m) => ({
      default: m.EditModeShell,
    })),
  { ssr: false },
);

interface Props {
  urlParam: string | null;
  cloudFileId: string | null;
  folder?: string;
}

/**
 * Viewport anchor for Edit mode.
 *
 * Filerobot's root is `width:100%; height:100%`, falling back to
 * `min-height: 250px` when the parent height resolves to `auto`. The (a)
 * shell renders pages into `.shell-main`, which is a CSS-grid area
 * (NOT a flex column) — so the (tools) layout's `flex-1 min-h-0 pt-10`
 * wrapper can collapse to content height, squeezing the editor.
 *
 * Anchoring to the viewport directly bypasses the wrapper chain entirely:
 * subtract the global shell header (2.5rem, transparent overlay) plus the
 * (tools) layout's pt-10 (2.5rem) so the editor fills the remaining space.
 * If the layout offsets change, update this calc — it's intentionally the
 * single place that owns full-page editor sizing.
 */
const EDITOR_VIEWPORT_HEIGHT = "calc(100dvh - 5rem)";

export default function EditShellClient({
  urlParam,
  cloudFileId,
  folder,
}: Props) {
  const initial = useMemo<ImageSource | null>(() => {
    if (urlParam) return { kind: "url", url: urlParam };
    if (cloudFileId) return { kind: "cloudFileId", cloudFileId };
    return null;
  }, [urlParam, cloudFileId]);

  const [source, setSource] = useState<ImageSource | null>(initial);

  return (
    <div
      className="w-full flex flex-col min-h-0 bg-background"
      style={{ height: EDITOR_VIEWPORT_HEIGHT }}
    >
      {source ? (
        <EditModeShell
          source={source}
          defaultFolder={folder ?? "Images/Edited"}
          presentation="page"
        />
      ) : (
        <ModeImagePicker
          title="Pick an image to edit"
          onPick={(file) => setSource({ kind: "file", file })}
        />
      )}
    </div>
  );
}
