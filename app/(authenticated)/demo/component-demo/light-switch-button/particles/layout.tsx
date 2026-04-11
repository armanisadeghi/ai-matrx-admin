import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/particles", {
  title: "Component Demo Light Switch Button Particles",
  description: "Interactive demo: Component Demo Light Switch Button Particles. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
