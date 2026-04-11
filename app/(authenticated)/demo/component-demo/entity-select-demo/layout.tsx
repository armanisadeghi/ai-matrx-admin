import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/entity-select-demo", {
  title: "Component Demo Entity Select Demo",
  description: "Interactive demo: Component Demo Entity Select Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
