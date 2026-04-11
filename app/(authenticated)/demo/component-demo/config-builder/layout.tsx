import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/config-builder", {
  title: "Component Demo Config Builder",
  description: "Interactive demo: Component Demo Config Builder. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
