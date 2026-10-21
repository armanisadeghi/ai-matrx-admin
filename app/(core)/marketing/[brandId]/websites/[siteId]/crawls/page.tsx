// record-view: none — a sub-view (crawls) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { CrawlsTable } from "@/features/marketing/components/crawls/CrawlsTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingCrawlsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading crawls…" />}>
      <CrawlsTable />
    </Suspense>
  );
}
