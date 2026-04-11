import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/glass-showcase", {
  title: "Component Demo Light Switch Button Glass Showcase",
  description: "Interactive demo: Component Demo Light Switch Button Glass Showcase. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
