import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/markdown-studio", {
  title: "Markdown Studio",
  description:
    "Prove rich content end to end: open a real note, study guide, chat message, agent prompt, or flashcard; replay it as a stream; hear it read aloud; and compare every parser.",
  letter: "MD",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
