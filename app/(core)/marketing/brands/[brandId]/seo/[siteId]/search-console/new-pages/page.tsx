// record-view: none — a sub-view (new-pages) inside a record or scope, not the record page; the record's own page carries the section
import { SiteSearchConsolePage } from "@/features/marketing/search-console/components/SiteSearchConsolePage";

/** New Pages — pages that started earning impressions in this window. */
export default async function MarketingSeoSearchConsoleNewPagesPage({
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
      tool="new-pages"
      label="Loading new pages…"
    />
  );
}
