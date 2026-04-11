import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/resizable-demo/nested-with-header-footer", {
  title: "Resizable Demo Nested With Header Footer",
  description: "Interactive demo: Resizable Demo Nested With Header Footer. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
