import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

// The page is a Client Component (it reads the query string), so the route's
// metadata boundary lives here.
export const metadata = createRouteMetadata("/drive", {
  title: "Drive",
  description:
    "The short link into a rulebook's driving interview — one thumb, from a lock screen.",
  letter: "Dr",
});

export default function DriveLayout({ children }: { children: ReactNode }) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
