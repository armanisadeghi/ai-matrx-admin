import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

// One tab of the "Intake Capture" tab shell — it names itself, so the browser tab and
// its badge change as a person switches tabs (scripts/check-tab-shell-titles.ts).
export const metadata = createRouteMetadata("/commerce/intake", {
  titlePrefix: "Admin",
  title: "Intake Capture",
  letter: "AD",
});

export default function CommerceIntakeAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
