import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/structured-section", {
  title: "Component Demo Structured Section",
  description: "Interactive demo: Component Demo Structured Section. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
