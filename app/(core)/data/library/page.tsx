// app/(core)/data/library/page.tsx — the Data library: every data source we can fetch into a table,
// at its own points price. The page is features/data-sources/library/DataLibraryPage.tsx; the
// /data layout already sends guests to the Data landing.

import { createRouteMetadata } from "@/utils/route-metadata";
import { DataLibraryPage } from "@/features/data-sources/library/DataLibraryPage";

export const metadata = createRouteMetadata("/data/library", {
  title: "Data library",
  description: "Reviews, places, products, jobs, companies and more, ready to fetch into a table.",
  letter: "DL",
});

export default function DataLibraryRoutePage() {
  return <DataLibraryPage />;
}
