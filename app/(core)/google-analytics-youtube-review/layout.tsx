import type { ReactNode } from "react";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

/**
 * /google-analytics-youtube-review/** — every page here names its levels through the derived trail; a page with its own header
 * draws it and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
 */
export default function GoogleAnalyticsYoutubeReviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
