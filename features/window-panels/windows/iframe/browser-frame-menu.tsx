"use client";

// browser-frame-menu — the shared right-click section for an embedded
// third-party site (`EmbedSiteFrame`), used by BrowserFrameWindow and
// BrowserWorkbenchWindow.
//
// The iframe hosts a page we do not control and cannot read — there is no
// "content" to act on, only the frame's own URL and title. Copy URL / Open
// in new tab / Reload are the honest ceiling for a cross-origin frame; see
// features/context-menu-host/SECTIONS.md.

import { Copy, ExternalLink, RotateCw } from "lucide-react";
import type { ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { openOutbound } from "@ai-matrx/kit/outbound";

export interface BrowserFrameMenuContext {
  url: string;
  title: string;
  /** Force the iframe to remount (the caller owns the `key`/nonce). */
  onReload: () => void;
}

export function buildBrowserFrameMenuSection(
  ctx: BrowserFrameMenuContext,
): ContextMenuExtraSection {
  return {
    id: "browser-frame",
    label: ctx.title,
    items: [
      {
        kind: "item",
        id: "reload",
        label: "Reload",
        icon: RotateCw,
        onSelect: ctx.onReload,
      },
      {
        kind: "item",
        id: "copy-url",
        label: "Copy URL",
        icon: Copy,
        onSelect: () => {
          void copyToClipboard(ctx.url, "URL copied");
        },
      },
      {
        kind: "item",
        id: "open-new-tab",
        label: "Open in new tab",
        icon: ExternalLink,
        onSelect: () => {
          openOutbound(ctx.url, "_blank", "noopener");
        },
      },
    ],
  };
}
