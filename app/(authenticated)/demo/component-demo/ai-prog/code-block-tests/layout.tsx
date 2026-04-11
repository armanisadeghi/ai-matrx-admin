import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog/code-block-tests", {
  title: "Component Demo Ai Prog Code Block Tests",
  description: "Interactive demo: Component Demo Ai Prog Code Block Tests. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
