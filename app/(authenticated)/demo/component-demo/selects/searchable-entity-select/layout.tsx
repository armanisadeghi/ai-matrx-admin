import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/searchable-entity-select", {
  title: "Component Demo Selects Searchable Entity Select",
  description: "Interactive demo: Component Demo Selects Searchable Entity Select. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
