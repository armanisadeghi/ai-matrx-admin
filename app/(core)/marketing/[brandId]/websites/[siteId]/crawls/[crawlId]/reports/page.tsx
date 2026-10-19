// record-view: none — a sub-view (reports) inside a record or scope, not the record page; the record's own page carries the section
import { CrawlReportsIndex } from "@/features/marketing/components/crawls/CrawlReportsIndex";

export default async function MarketingCrawlReportsPage({
  params,
}: {
  params: Promise<{ crawlId: string }>;
}) {
  const { crawlId } = await params;
  return <CrawlReportsIndex crawlId={crawlId} />;
}
