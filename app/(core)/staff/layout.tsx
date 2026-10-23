import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/staff", {
  title: "Your staff",
  description:
    "Your staff, in the app — the same conversation your texts and calls already use.",
  letter: "Sa",
  additionalMetadata: {
    keywords: ["your staff", "chief of staff", "assistant", "AI Matrx"],
  },
});

export default function StaffLayout({
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
