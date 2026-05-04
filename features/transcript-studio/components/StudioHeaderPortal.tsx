"use client";

/**
 * StudioHeaderPortal — injects studio-specific controls into the global app
 * header via the standard `<PageSpecificHeader>` portal. Renders the
 * active session's title (editable) + the two most-used actions
 * (Record / Save as Transcript) so they stay visible regardless of which
 * column the user is reading or whether the studio header itself has
 * scrolled out of view.
 *
 * The portal target is `#shell-header-center` (SSR shell) or
 * `#page-specific-header-content` (auth layout) — see
 * `components/layout/new-layout/PageSpecificHeader.tsx`. We never write to
 * the right-most slot of the global header; that's reserved for the
 * user-avatar / global controls.
 */

import { PageSpecificHeader } from "@/components/layout/new-layout/PageSpecificHeader";
import type { StudioSession } from "../types";
import { EditableSessionTitle } from "./EditableSessionTitle";
import { RecordButton } from "./recording/RecordButton";
import { SaveAsTranscriptButton } from "./conversion/SaveAsTranscriptButton";

interface StudioHeaderPortalProps {
  session: StudioSession;
}

export function StudioHeaderPortal({ session }: StudioHeaderPortalProps) {
  return (
    <PageSpecificHeader>
      <div className="flex h-full min-w-0 items-center gap-2 px-2">
        <div className="min-w-0 flex-1">
          <EditableSessionTitle
            sessionId={session.id}
            title={session.title}
            className="text-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SaveAsTranscriptButton
            sessionId={session.id}
            hasLinkedTranscript={Boolean(session.transcriptId)}
          />
          <RecordButton sessionId={session.id} />
        </div>
      </div>
    </PageSpecificHeader>
  );
}
