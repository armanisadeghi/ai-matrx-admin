// record-view: none — a sub-view (email) inside a record or scope, not the record page; the record's own page carries the section
// app/(core)/marketing/brands/[brandId]/email/page.tsx
//
// One brand's Email section. Today email IS Lane B — outreach sent from the
// customer's own verified mailbox — so this route opens the mailbox, the
// templates and the campaigns. Lane A (opt-in list marketing) stays a
// registered promise printed on the page; see the component header.
//
// Brand-scoped 2026-08-30: `BrandScopedEmail` binds the canonical
// `EmailFrontDoor` to `useMarketingBrand()`, so the mailbox count is this
// brand's organization and this brand's template library is named and comes
// first. Templates, campaigns and the other organizations' libraries have NO
// brand link in the data model — they stay, and the page says out loud that
// they reach past this brand. A filter we cannot apply is never faked.


import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { BrandScopedEmail } from "@/features/marketing/front-doors/BrandScopedEmail";

export default function BrandEmailPage() {
  return (
    <>
      <RecordPageHeader level={{ name: "Email" }} />
      <BrandScopedEmail />
    </>
  );
}
