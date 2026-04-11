import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/markdown-text-block-editor", {
  title: "Component Demo Markdown Text Block Editor",
  description: "Interactive demo: Component Demo Markdown Text Block Editor. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
