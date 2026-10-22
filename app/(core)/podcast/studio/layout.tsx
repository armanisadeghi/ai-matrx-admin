import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/podcast", {
  titlePrefix: "Studio",
  title: "Podcasts",
  description: "Create and manage AI-produced podcast episodes.",
  letter: "PS",
});

export default function PodcastStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The studio's pages name their levels through the derived trail; a page with its own header
  // (a show, a run) draws it and this steps aside (crumb doors, features/shell/FEATURE.md).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
