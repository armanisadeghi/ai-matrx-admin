import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

// Arman, 2026-09-20: playgrounds never live under admin — admin manages,
// it does not run code. The Decision playground moved here from
// `/administration/ai/ai-models/decisions`; it is a normal authenticated route.
export const metadata = createRouteMetadata("/decisions", {
  title: "Decisions",
  description:
    "Ask yes-or-no, pick-one, score and how-true questions about a situation and use each answer directly.",
  letter: "Dn",
});

export default function DecisionsLayout({
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
