import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/select-showcase", {
  title: "Component Demo Light Switch Button Select Showcase",
  description: "Interactive demo: Component Demo Light Switch Button Select Showcase. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
