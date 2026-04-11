import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/entity-analyzer/mock-data", {
  title: "Component Demo Entity Analyzer Mock Data",
  description: "Interactive demo: Component Demo Entity Analyzer Mock Data. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
