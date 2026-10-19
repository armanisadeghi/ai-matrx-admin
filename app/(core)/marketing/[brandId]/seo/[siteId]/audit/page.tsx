// record-view: none — a sub-view (audit) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { AuditWorkspace } from "@/features/marketing/components/audit/AuditWorkspace";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSeoAuditPage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading site audit…" />}>
      <AuditWorkspace />
    </Suspense>
  );
}
