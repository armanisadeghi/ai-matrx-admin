import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/sortable-demo/dnd", {
  title: "Component Demo Sortable Demo Dnd",
  description: "Interactive demo: Component Demo Sortable Demo Dnd. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
