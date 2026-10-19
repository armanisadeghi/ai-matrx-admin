// record-view: none — an editor or builder (new) for a record; the record's own page carries the section
import { Suspense } from "react";

import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { VideoCloneNew } from "@/features/marketing/social/components/video/VideoCloneNew";

export default function BrandSocialVideoNewPage() {
  return (
    <Suspense fallback={<RegionSkeleton shape="form" count={6} aria-label="Loading clone" />}>
      <VideoCloneNew />
    </Suspense>
  );
}
