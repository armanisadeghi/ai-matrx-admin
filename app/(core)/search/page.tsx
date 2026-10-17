// app/(core)/search/page.tsx
//
// Matrx Search — the platform's search engine. One experience (`SearchExperience`) answers every
// kind of search: the web, news, images, places, social, and the catalog tabs (Deep, Reviews,
// AI answers) that run Tools through /tools/calls. The address is the state (`?q=`, `?tab=`, …).
//
// Guests never reach this file — the layout serves them the landing instead.

import PageHeader from "@/features/shell/components/header/PageHeader";
import { SearchPage } from "@/features/search/components/SearchPage";

export default function SearchRoute() {
  return (
    <>
      <PageHeader>
        <span className="text-sm font-medium text-foreground">Search</span>
      </PageHeader>
      <SearchPage />
    </>
  );
}
