import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/json-viewer", {
  title: "Component Demo Json Viewer",
  description: "Interactive demo: Component Demo Json Viewer. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
