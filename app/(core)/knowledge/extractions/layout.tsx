import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/knowledge/extractions", {
  titlePrefix: "Extractions",
  title: "Knowledge",
  description: "Browse and manage knowledge extractions.",
  letter: "Ke",
});

export default function KnowledgeExtractionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
