import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/sortable-demo/drag-drop-1", {
  title: "Component Demo Sortable Demo Drag Drop 1",
  description: "Interactive demo: Component Demo Sortable Demo Drag Drop 1. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
