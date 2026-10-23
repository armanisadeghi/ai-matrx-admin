import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/workflows", {
  title: "Workflows",
  description: "Run your workflows and watch them work, step by step",
  letter: "WF",
});

export default function WorkflowsLayout({ children }: { children: ReactNode }) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
