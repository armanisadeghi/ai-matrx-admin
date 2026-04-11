import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/floating-sheet/persistence", {
  title: "Component Demo Floating Sheet Persistence",
  description: "Interactive demo: Component Demo Floating Sheet Persistence. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
