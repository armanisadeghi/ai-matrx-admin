import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/agents", {
  title: "Agents",
  description: "Build, configure, and deploy AI agents",
  letter: "AG",
  additionalMetadata: {
    keywords: [
      "AI agents",
      "agent builder",
      "autonomous AI",
      "AI automation",
      "agent deployment",
    ],
  },
});

export default function AgentsLayout({
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
