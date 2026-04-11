import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/orbital-demo/reusable", {
  title: "Component Demo Light Switch Button Orbital Demo Reusable",
  description: "Interactive demo: Component Demo Light Switch Button Orbital Demo Reusable. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
