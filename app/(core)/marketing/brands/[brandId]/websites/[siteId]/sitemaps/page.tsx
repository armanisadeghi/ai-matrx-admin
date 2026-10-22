// record-view: none — a sub-view (sitemaps) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { SitemapsWorkspace } from "@/features/marketing/components/sitemaps/SitemapsWorkspace";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSiteSitemapsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading sitemaps…" />}>
      <SitemapsWorkspace />
    </Suspense>
  );
}
