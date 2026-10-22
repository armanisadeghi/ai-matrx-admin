// record-view: none — a sub-view (reputation) inside a record or scope, not the record page; the record's own page carries the section
// app/(core)/marketing/brands/[brandId]/intelligence/reputation/page.tsx
//
// Reputation is answered per WEBSITE, so the brand-level route is a chooser
// over this brand's sites — never a second copy of the workspace.


import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { BrandReputationSites } from "@/features/marketing/components/reputation/BrandReputationSites";

export default function BrandReputationPage() {
  return (
    <>
      <RecordPageHeader record={{ name: "Reputation" }} />
      <BrandReputationSites />
    </>
  );
}
