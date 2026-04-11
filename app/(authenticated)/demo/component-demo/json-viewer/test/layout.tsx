import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/json-viewer/test", {
  title: "Component Demo Json Viewer Test",
  description: "Interactive demo: Component Demo Json Viewer Test. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
