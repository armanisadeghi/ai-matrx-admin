import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/socket-form-builder", {
  title: "Component Demo Socket Form Builder",
  description: "Interactive demo: Component Demo Socket Form Builder. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
