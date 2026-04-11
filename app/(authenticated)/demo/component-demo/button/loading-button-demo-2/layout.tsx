import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/button/loading-button-demo-2", {
  title: "Component Demo Button Loading Button Demo 2",
  description: "Interactive demo: Component Demo Button Loading Button Demo 2. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
