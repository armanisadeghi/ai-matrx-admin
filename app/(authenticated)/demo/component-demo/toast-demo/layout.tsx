import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/toast-demo", {
  title: "Component Demo Toast Demo",
  description: "Interactive demo: Component Demo Toast Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
