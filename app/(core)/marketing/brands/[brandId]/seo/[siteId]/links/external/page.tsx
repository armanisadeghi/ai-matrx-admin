// record-view: none — a sub-view (external) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { LinksInspectionTable } from "@/features/marketing/components/inspection/LinksInspectionTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

/** Outbound links grouped by destination domain. */
export default function MarketingSeoLinksExternalPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading external links…" />}>
      <LinksInspectionTable view="external" />
    </Suspense>
  );
}
