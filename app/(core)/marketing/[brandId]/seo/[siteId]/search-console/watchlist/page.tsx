// record-view: none — a sub-view (watchlist) inside a record or scope, not the record page; the record's own page carries the section
import { SiteSearchConsolePage } from "@/features/marketing/search-console/components/SiteSearchConsolePage";

/** Watchlist — the queries and pages you asked to be told about. */
export default async function MarketingSeoSearchConsoleWatchlistPage({
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
      tool="watchlist"
      label="Loading watchlist…"
    />
  );
}
