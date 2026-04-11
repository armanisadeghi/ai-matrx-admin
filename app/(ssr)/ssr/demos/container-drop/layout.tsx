import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ssr/demos/container-drop", {
  title: "Container Drop",
  description: "Interactive demo: Container Drop. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
