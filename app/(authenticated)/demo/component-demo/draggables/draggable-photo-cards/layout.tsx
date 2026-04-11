import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables/draggable-photo-cards", {
  title: "Component Demo Draggables Draggable Photo Cards",
  description: "Interactive demo: Component Demo Draggables Draggable Photo Cards. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
