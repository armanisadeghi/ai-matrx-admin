import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ssr/demos/screen-capture", {
  title: "Screen Capture",
  description: "Interactive demo: Screen Capture. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
