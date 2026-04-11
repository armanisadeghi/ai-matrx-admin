import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog/streaming-diff", {
  title: "Component Demo Ai Prog Streaming Diff",
  description: "Interactive demo: Component Demo Ai Prog Streaming Diff. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
