// record-view: none — a sub-view (formats) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { VideoFormatNew } from "@/features/marketing/social/components/video/VideoFormatNew";

export default function BrandSocialVideoFormatsPage() {
  return (
    <Suspense fallback={<RegionSkeleton shape="cards" count={6} aria-label="Loading formats" />}>
      <VideoFormatNew />
    </Suspense>
  );
}
