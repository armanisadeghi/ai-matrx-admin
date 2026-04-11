import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/searchable-entity-select/isolated-test", {
  title: "Component Demo Selects Searchable Entity Select Isolated Test",
  description: "Interactive demo: Component Demo Selects Searchable Entity Select Isolated Test. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
