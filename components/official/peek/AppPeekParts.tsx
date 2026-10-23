"use client";

/**
 * AppPeekParts — what only the app can draw inside THE peek (`@ai-matrx/design-system` `Peek`).
 *
 * A peek record names these by token and id and the package hands them here:
 *   - `custom-fields` — the organization's own fields for the record (`EntityCustomFields`; nothing
 *     when the record's table takes none), the section every record view shows;
 *   - `access` — the honest state when the record could not be read (`AccessGate`);
 *   - `media` — a stored file's thumbnail (`MediaThumbnail`);
 *   - `markdown` — formatted text through THE rich-content renderer (`RichContent`, level standard;
 *     `RichContentPreview` when the section has a line limit).
 * Mounted once, app-wide, inside `MatrxDataTableHost`, so every peek on every page gets them. Each
 * part loads on first use — the peek's parts never ride the root bundle.
 */

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { PeekPartRendererProvider, type PeekPart } from "@ai-matrx/design-system";

const EntityCustomFields = dynamic(
  () => import("@/features/unified-data/components/EntityCustomFields").then((m) => m.EntityCustomFields),
  { ssr: false },
);
const LazyAccessGate = dynamic(() => import("@ai-matrx/sharing/access/react").then((m) => m.AccessGate), {
  ssr: false,
});
const RichContent = dynamic(() => import("@ai-matrx/rich-content/levels/RichContent").then((m) => m.RichContent), {
  ssr: false,
});
const RichContentPreview = dynamic(
  () => import("@ai-matrx/rich-content/levels/RichContentPreview").then((m) => m.RichContentPreview),
  { ssr: false },
);
const MediaThumbnail = dynamic(() => import("@ai-matrx/media/react").then((m) => m.MediaThumbnail), { ssr: false });

function renderPeekPart(part: PeekPart): ReactNode {
  switch (part.part) {
    case "custom-fields":
      // Collapsed in a quick look: the records-ui screen loads when the person opens the section.
      return <EntityCustomFields entityToken={part.token} recordId={part.id} absentWhenNotApplicable collapsed />;
    case "access":
      return <LazyAccessGate token={part.token} id={part.id} {...(part.error !== undefined ? { error: part.error } : {})} />;
    case "media":
      return (
        <MediaThumbnail
          mediaRef={{ file_id: part.id, ...(part.mimeType ? { mime_type: part.mimeType } : {}) }}
          fileName={part.name ?? ""}
          mimeType={part.mimeType ?? null}
          iconSize={40}
          className="h-full w-full"
        />
      );
    case "markdown":
      // A line limit is a short preview (inline, a shape as one line); otherwise the full formatted text.
      return part.clamp ? (
        <RichContentPreview source={part.text} lines={part.clamp} />
      ) : (
        <RichContent source={part.text} level="standard" />
      );
  }
}

export function AppPeekParts({ children }: { children: ReactNode }) {
  return <PeekPartRendererProvider render={renderPeekPart}>{children}</PeekPartRendererProvider>;
}
