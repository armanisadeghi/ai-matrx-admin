// record-view: none — a sub-view (snapshots) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { CrawlSnapshotsInspectionTable } from "@/features/marketing/components/inspection/CrawlSnapshotsInspectionTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default async function MarketingCrawlSnapshotsPage({
  params,
}: {
  params: Promise<{ crawlId: string }>;
}) {
  const { crawlId } = await params;
  return (
    <Suspense fallback={<LoadingSurface label="Loading crawl page captures…" />}>
      <CrawlSnapshotsInspectionTable crawlId={crawlId} />
    </Suspense>
  );
}
