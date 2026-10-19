// record-view: none — a sub-view (insights) inside a record or scope, not the record page; the record's own page carries the section
import { SiteSearchConsolePage } from "@/features/marketing/search-console/components/SiteSearchConsolePage";

/** Insights — the algorithms that read this site's Search Console data for you. */
export default async function MarketingSeoSearchConsoleInsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ brandId: string; siteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SiteSearchConsolePage
      params={params}
      searchParams={searchParams}
      tool="insights"
      label="Loading insights…"
    />
  );
}
