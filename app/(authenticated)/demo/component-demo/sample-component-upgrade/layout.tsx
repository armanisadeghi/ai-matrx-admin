import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/sample-component-upgrade", {
  title: "Component Demo Sample Component Upgrade",
  description: "Interactive demo: Component Demo Sample Component Upgrade. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
