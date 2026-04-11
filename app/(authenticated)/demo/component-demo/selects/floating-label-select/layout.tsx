import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/floating-label-select", {
  title: "Component Demo Selects Floating Label Select",
  description: "Interactive demo: Component Demo Selects Floating Label Select. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
