// The cross-brand SEO Capabilities catalog — the site-less inventory and
// control surface the old flat `/marketing/capabilities` served (its website
// selector lives inside `SeoCapabilitiesWorkspace`). Restored 2026-08-30 after
// the agency-model restructure's smart shim dropped the no-`?site=` mode
// (adversarial audit finding). Per-site capability pages stay canonical at
// `/marketing/brands/[brandId]/seo/[siteId]/capabilities` — same component, bound;
// this page is the Operations plane's control-surface door across every brand.

import { Suspense } from "react";

import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { SeoCapabilitiesWorkspace } from "@/features/marketing/seo/capabilities/SeoCapabilitiesWorkspace";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";

export default function OperationsCapabilitiesPage() {
  return (
    <>
      <RecordPageHeader level={{ name: "SEO Capabilities" }} />
      <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
        <Suspense fallback={<LoadingSurface label="Loading SEO capabilities…" />}>
          <SeoCapabilitiesWorkspace />
        </Suspense>
      </div>
    </>
  );
}
