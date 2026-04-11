import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/light-switch-demo-2", {
  title: "Component Demo Light Switch Button Light Switch Demo 2",
  description: "Interactive demo: Component Demo Light Switch Button Light Switch Demo 2. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
