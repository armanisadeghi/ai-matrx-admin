/**
 * features/files/media-client/MediaHostProvider.tsx
 *
 * Mounts `@ai-matrx/media`'s MediaProvider ONCE for the whole app, wiring
 * the strangler MediaClient (over today's file handler) and the host ports
 * (next/image adapter, audio playback session, action flows). Every media
 * component/hook from the package resolves through this provider.
 */

"use client";

import type { ReactNode } from "react";
import { MediaProvider } from "@ai-matrx/media/core";
import {
  getMediaViewer,
  lazyMediaViewer,
  registerMediaViewer,
} from "@ai-matrx/media/viewers";
import { mediaClient } from "./client";
import { mediaHostPorts } from "./ports";

// THE PDF engine for every `MediaFileViewer` in the app (chat's attachment
// panel included), registered once at startup and loaded only when a PDF opens.
// The file-preview module registers the same viewer statically when it loads;
// this keeps a surface that never loads it (chat) from showing "no viewer".
if (!getMediaViewer("pdf")) {
  registerMediaViewer(
    "pdf",
    lazyMediaViewer(() =>
      import("@/features/files/components/core/FilePreview/PreviewerSwitch").then(
        (m) => m.HostPdfViewer,
      ),
    ),
  );
}

export function MediaHostProvider({ children }: { children: ReactNode }) {
  return (
    <MediaProvider
      client={mediaClient}
      ports={mediaHostPorts}
    >
      {children}
    </MediaProvider>
  );
}
