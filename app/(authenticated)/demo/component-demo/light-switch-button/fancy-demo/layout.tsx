import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/light-switch-button/fancy-demo", {
  title: "Component Demo Light Switch Button Fancy Demo",
  description: "Interactive demo: Component Demo Light Switch Button Fancy Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
