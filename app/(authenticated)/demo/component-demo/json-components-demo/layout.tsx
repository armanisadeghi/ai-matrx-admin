import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/json-components-demo", {
  title: "Component Demo Json Components Demo",
  description: "Interactive demo: Component Demo Json Components Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
