// record-view: none — a full-viewport editor for a record, not the record view
import { Suspense } from "react";

import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { VideoProjectStudio } from "@/features/marketing/social/components/video/VideoProjectStudio";

export default async function BrandSocialVideoProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<RegionSkeleton shape="form" count={6} aria-label="Loading video" />}>
      <VideoProjectStudio projectId={projectId} />
    </Suspense>
  );
}
