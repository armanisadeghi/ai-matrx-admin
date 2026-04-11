import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button", {
  title: "Component Demo Light Switch Button",
  description: "Interactive demo: Component Demo Light Switch Button. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
