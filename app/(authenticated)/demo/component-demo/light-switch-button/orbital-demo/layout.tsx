import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/orbital-demo", {
  title: "Component Demo Light Switch Button Orbital Demo",
  description: "Interactive demo: Component Demo Light Switch Button Orbital Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
