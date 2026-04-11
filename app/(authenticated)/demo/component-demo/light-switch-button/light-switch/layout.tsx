import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/light-switch", {
  title: "Component Demo Light Switch Button Light Switch",
  description: "Interactive demo: Component Demo Light Switch Button Light Switch. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
