"use client";

// The 360 review meeting held in person: the Meet panel's side-by-side, full page, one screen.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@ai-matrx/design-system/controls";

import { useHrContext } from "@/features/hr/shared/useHrContext";

import { Review360Host } from "./Review360Host";
import { Review360SideBySide, isReview360Section, type Review360Section } from "./Review360SideBySide";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import {
  HR_REVIEW_360_MEETING_SURFACE,
  createHrReview360MeetingScope,
} from "@/features/surfaces/manifests/hr-review-360-meeting.manifest";

export function Review360InPersonPage({ reviewId }: { reviewId: string }) {
  const params = useSearchParams();
  const hr = useHrContext();
  const org = params?.get("org") || hr.active?.organization_id || null;
  const [section, setSection] = useState<Review360Section>("accomplishments");
  // The review and both halves arrive from Review360SideBySide's own read (a scope contribution).
  const getScope = () => createHrReview360MeetingScope({ meeting_section: section });
  const getWriteHandlers = () => ({
    meeting_section: {
      validate: (value: unknown) => {
        if (typeof value !== "string" || !isReview360Section(value)) refuseSurfaceWrite("Name one section: responsibilities, accomplishments, strengths, opportunities or goals.");
      },
      apply: (value: unknown) => {
        setSection(value as Review360Section);
        return { summary: `The meeting screen shows ${String(value)}.` };
      },
    },
  });
  return (
    <SurfaceRuntimeProvider surfaceName={HR_REVIEW_360_MEETING_SURFACE} getScope={getScope} getWriteHandlers={getWriteHandlers}>
    <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
      {!org ? (
        // read-gate-exempt: org comes from the HR context, not a read
        <EmptyState icon={<ClipboardCheck />} title="Pick an employer first" />
      ) : (
        <Review360Host organizationId={org}>
          <div className="mx-auto max-w-5xl px-3 pt-3">
            <Review360SideBySide
              reviewId={reviewId}
              organizationId={org}
              section={section}
              onSection={setSection}
              surfaceName={HR_REVIEW_360_MEETING_SURFACE}
            />
          </div>
        </Review360Host>
      )}
    </div>
    </SurfaceRuntimeProvider>
  );
}
