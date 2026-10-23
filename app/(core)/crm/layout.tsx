import type { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/crm", {
  title: "CRM",
  description:
    "Manage contacts, including contact details, affiliations, activity, notes, and files.",
  letter: "CR",
});

export default function CrmLayout({ children }: { children: ReactNode }) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
