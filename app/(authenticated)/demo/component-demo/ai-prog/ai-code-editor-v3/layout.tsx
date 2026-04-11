import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog/ai-code-editor-v3", {
  title: "Component Demo Ai Prog Ai Code Editor V3",
  description: "Interactive demo: Component Demo Ai Prog Ai Code Editor V3. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
