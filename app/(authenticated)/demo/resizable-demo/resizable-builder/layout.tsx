import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/resizable-demo/resizable-builder", {
  title: "Resizable Demo Resizable Builder",
  description: "Interactive demo: Resizable Demo Resizable Builder. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
