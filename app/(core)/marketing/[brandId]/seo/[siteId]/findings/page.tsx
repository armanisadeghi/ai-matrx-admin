// record-view: none — a sub-view (findings) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { FindingsTable } from "@/features/marketing/components/analysis/FindingsTable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSeoFindingsPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading findings…" />}>
      <FindingsTable />
    </Suspense>
  );
}
