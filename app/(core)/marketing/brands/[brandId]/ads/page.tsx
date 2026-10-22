// record-view: none — a sub-view (ads) inside a record or scope, not the record page; the record's own page carries the section
// app/(core)/marketing/brands/[brandId]/ads/page.tsx
//
// One brand's Advertising section. `GoogleAdsWorkspace` needs a live Google
// token, so it keeps the same `LazyGoogleAPIProvider` wrapper (and the same
// reporting scopes) the flat `/marketing/ads` route gave it — the provider is
// part of the mount, not page decoration.

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { GoogleAdsWorkspace } from "@/features/marketing/ads/GoogleAdsWorkspace";
import { LazyGoogleAPIProvider } from "@/providers/google-provider/LazyGoogleAPIProvider";
import { GOOGLE_ADS_REPORTING_SCOPES } from "@/lib/googleScopes";

export default function BrandAdsPage() {
  return (
    <>
      <RecordPageHeader record={{ name: "Google Ads" }} />
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <LazyGoogleAPIProvider scopes={[...GOOGLE_ADS_REPORTING_SCOPES]}>
          <GoogleAdsWorkspace />
        </LazyGoogleAPIProvider>
      </div>
    </>
  );
}
