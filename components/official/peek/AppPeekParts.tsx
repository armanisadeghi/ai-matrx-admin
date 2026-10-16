"use client";

/**
 * AppPeekParts — what only the app can draw inside THE peek (`@ai-matrx/design-system` `Peek`).
 *
 * A peek record names these by token and id and the package hands them here:
 *   - `custom-fields` — the organization's own fields for the record (`EntityCustomFields`; nothing
 *     when the record's table takes none), the section every record view shows;
 *   - `access` — the honest state when the record could not be read (`AccessGate`);
 *   - `media` — a stored file's thumbnail (`MediaThumbnail`);
 *   - `markdown` — formatted text through THE rich-content renderer (`RichContent`, level standard).
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
const AccessGate = dynamic(() => import("@/features/access-gate/components/AccessGate").then((m) => m.AccessGate), {
  ssr: false,
});
const RichContent = dynamic(() => import("@ai-matrx/rich-content/levels/RichContent").then((m) => m.RichContent), {
  ssr: false,
});
const MediaThumbnail = dynamic(() => import("@ai-matrx/media/react").then((m) => m.MediaThumbnail), { ssr: false });

function renderPeekPart(part: PeekPart): ReactNode {
  switch (part.part) {
    case "custom-fields":
      return <EntityCustomFields entityToken={part.token} recordId={part.id} absentWhenNotApplicable />;
    case "access":
      return <AccessGate token={part.token} id={part.id} {...(part.error !== undefined ? { error: part.error } : {})} />;
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
      return <RichContent source={part.text} level="standard" />;
  }
}

export function AppPeekParts({ children }: { children: ReactNode }) {
  return <PeekPartRendererProvider render={renderPeekPart}>{children}</PeekPartRendererProvider>;
}
