// app/(core)/hr/layout.tsx
//
// ONE employer resolution for the whole `/hr` tree.
//
// Without `<HrProvider>` every shell, nav item, page and panel would fire its own
// `hr_my_context` — and, worse, they could briefly DISAGREE about which employer
// they are showing. In a strictly single-employer module that is a data-integrity
// problem, not a performance one: two surfaces on one screen showing two
// employers' data is the compliance defect the whole module is built to prevent.
//
// This layout deliberately adds NO wrapper element. `HrShell` is `h-full` and its
// height chain runs all the way up to `.shell-main`; a plain `<div>` here would
// break that chain from a file nobody would think to look in. It also adds no
// vertical clipping — a route layout boundary must never amputate its children.
//
// `<HrProvider>` reads `?org_filter=` through `useSearchParams`, so it sits behind a
// Suspense boundary with a real skeleton rather than a spinner.

import { Suspense, type ReactNode } from "react";

import { HrFrameSidebar } from "@/features/hr/shared/HrFrameMenu";
import { HrProvider } from "@/features/hr/shared/HrProvider";
import { HrLoading } from "@/features/hr/shared/HrStates";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/hr", {
  title: "Human Resources",
  description: "Manage people, time, payroll, compliance, and workforce operations.",
});

export default function HrLayout({ children }: { children: ReactNode }) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      <Suspense fallback={<HrLoading variant="cards" rows={4} />}>
        <HrProvider>
          {/* The new app frame's ONE HR menu (its sidebar); renders nothing in classic. */}
          <HrFrameSidebar>{children}</HrFrameSidebar>
        </HrProvider>
      </Suspense>
    </>
  );
}
