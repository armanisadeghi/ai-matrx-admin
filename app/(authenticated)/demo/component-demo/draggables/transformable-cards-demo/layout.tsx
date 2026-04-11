import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables/transformable-cards-demo", {
  title: "Component Demo Draggables Transformable Cards Demo",
  description: "Interactive demo: Component Demo Draggables Transformable Cards Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
