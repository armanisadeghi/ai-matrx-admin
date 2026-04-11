import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/entity-select-demo/selection-demo-two", {
  title: "Component Demo Entity Select Demo Selection Demo Two",
  description: "Interactive demo: Component Demo Entity Select Demo Selection Demo Two. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
