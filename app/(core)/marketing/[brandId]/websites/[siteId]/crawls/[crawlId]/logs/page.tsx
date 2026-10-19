// record-view: none — a sub-view (logs) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { CrawlLogsTable } from "@/features/marketing/components/crawls/CrawlLogsTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default async function MarketingCrawlLogsPage({
  params,
}: {
  params: Promise<{ crawlId: string }>;
}) {
  const { crawlId } = await params;
  return (
    <Suspense fallback={<LoadingSurface label="Loading crawl events…" />}>
      <CrawlLogsTable crawlId={crawlId} />
    </Suspense>
  );
}
