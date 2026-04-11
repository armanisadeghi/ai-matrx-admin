import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables/container-drop-demo", {
  title: "Component Demo Draggables Container Drop Demo",
  description: "Interactive demo: Component Demo Draggables Container Drop Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
