import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/button/loading-button-demo", {
  title: "Component Demo Button Loading Button Demo",
  description: "Interactive demo: Component Demo Button Loading Button Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
