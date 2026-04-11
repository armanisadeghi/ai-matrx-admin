import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/floating-sheet", {
  title: "Component Demo Floating Sheet",
  description: "Interactive demo: Component Demo Floating Sheet. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
