import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables/draggable-interactive-cards", {
  title: "Component Demo Draggables Draggable Interactive Cards",
  description: "Interactive demo: Component Demo Draggables Draggable Interactive Cards. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
