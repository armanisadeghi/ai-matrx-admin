// record-view: none — a sub-view (structure) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";
import { StructureWorkspace } from "@/features/marketing/components/structure/StructureWorkspace";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export default function MarketingSiteStructurePage() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading site structure…" />}>
      <StructureWorkspace />
    </Suspense>
  );
}
