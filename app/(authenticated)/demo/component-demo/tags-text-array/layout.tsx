import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/tags-text-array", {
  title: "Component Demo Tags Text Array",
  description: "Interactive demo: Component Demo Tags Text Array. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
