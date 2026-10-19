// record-view: none — search results span records and sources
// app/(core)/search/page.tsx
//
// Matrx Search — the platform's search engine. One experience (`SearchExperience`) answers every
// kind of search: the web, news, images, places, social, and the catalog tabs (Deep, Reviews,
// AI answers) that run Tools through /tools/calls. The address is the state (`?q=`, `?tab=`, …).
//
// The page reads the address server-side so a NAVIGATION (the command bar's "Search the web for…",
// a shared link) starts the experience over on its own query and tab, while the page's own
// address writes (search → `?q=…`) never remount it.
//
// Guests never reach this file — the layout serves them the landing instead.

import PageHeader from "@/features/shell/components/header/PageHeader";
import { SearchPage } from "@/features/search/components/SearchPage";
import { readSearchQuery, SEARCH_QUERY_PARAM } from "@/features/search/search-url";

export default async function SearchRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readSearchQuery(params[SEARCH_QUERY_PARAM]);
  const tab = readSearchQuery(params.tab);

  return (
    <>
      <PageHeader>
        <span className="text-sm font-medium text-foreground">Search</span>
      </PageHeader>
      <SearchPage key={`${query}|${tab}`} />
    </>
  );
}
