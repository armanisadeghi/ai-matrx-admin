import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/entity-analyzer", {
  title: "Component Demo Entity Analyzer",
  description: "Interactive demo: Component Demo Entity Analyzer. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
