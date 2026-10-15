import { createRouteMetadata } from "@/utils/route-metadata";

// One tab of the "AI Models" tab shell — it names itself, so the browser tab and
// its badge change as a person switches tabs (scripts/check-tab-shell-titles.ts).
export const metadata = createRouteMetadata("/administration", {
  titlePrefix: "Discovery",
  title: "AI Models",
  letter: "DI",
});

export default function AdministrationAiAiModelsDiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
