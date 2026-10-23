import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/code", {
  title: "Code",
  description:
    "VSCode-style workspace for editing sandbox files, running commands, and collaborating with agents.",
  letter: "CD",
  additionalMetadata: {
    keywords: [
      "code editor",
      "sandbox",
      "agent coding",
      "terminal",
      "AI Matrx",
    ],
  },
});

export default function CodeLayout({
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
