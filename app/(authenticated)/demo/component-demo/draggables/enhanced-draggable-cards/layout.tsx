import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables/enhanced-draggable-cards", {
  title: "Component Demo Draggables Enhanced Draggable Cards",
  description: "Interactive demo: Component Demo Draggables Enhanced Draggable Cards. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
