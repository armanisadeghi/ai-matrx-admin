import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/light-switch-demo-2/reusable", {
  title: "Component Demo Light Switch Button Light Switch Demo 2 Reusable",
  description: "Interactive demo: Component Demo Light Switch Button Light Switch Demo 2 Reusable. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
