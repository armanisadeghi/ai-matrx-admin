import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/floating-labels", {
  title: "Component Demo Floating Labels",
  description: "Interactive demo: Component Demo Floating Labels. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
