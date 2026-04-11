import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/structured-section/themed-section-component", {
  title: "Component Demo Structured Section Themed Section Component",
  description: "Interactive demo: Component Demo Structured Section Themed Section Component. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
