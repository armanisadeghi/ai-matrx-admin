import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/tool-selector", {
  title: "Component Demo Tool Selector",
  description: "Interactive demo: Component Demo Tool Selector. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
