// app/(core)/marketing/page.tsx
//
// The Marketing home. Arman, 2026-10-21: "Each page should show the things that
// it includes" — the full brand card/table list lives on /marketing/brands;
// this page carries the headline numbers across brands, a glimpse of brands,
// and a map of everything in Marketing (features/marketing/home).

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { MarketingHome } from "@/features/marketing/home/MarketingHome";
import { MARKETING_PILLARS } from "@/features/marketing/lib/marketing-nav";
import { MandateDoorLink } from "@/features/mandates/components/MandateDoorLink";

export default function MarketingPage() {
  return (
    <>
      <RecordPageHeader level={{ name: "Marketing" }} />
      <MandateDoorLink feature="seo" label="Marketing & SEO agents" className="ml-auto" />
      <div className="h-full overflow-hidden">
        <MarketingHome pillars={MARKETING_PILLARS} />
      </div>
    </>
  );
}
