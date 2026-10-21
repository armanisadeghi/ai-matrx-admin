// app/(core)/search/page.tsx
//
// Matrx Search — the platform's search engine, laid out as Google is (owner's ruling, 2026-10-21:
// "the initial page needs to be a duplicate but still offer all of our options"). One experience
// (`SearchExperience`) answers every kind of search: the web, images, videos, news, shopping, places,
// and under More the social lookup, jobs, trends and the catalog tabs (Deep, Reviews, AI answers).
// The address is the state (`?q=`, `?tab=`, …).
//
// The page reads the address server-side so a NAVIGATION (the command bar's "Search the web for…",
// a shared link) starts the experience over on its own query and tab, while the page's own
// address writes (search → `?q=…`) never remount it.
//
// Guests never reach this file — the layout serves them the same experience on the free allowance.

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

  return <SearchPage key={`${query}|${tab}`} />;
}
// record-view: none — the search tool, not a record page
