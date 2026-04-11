import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog/direct", {
  title: "Component Demo Ai Prog Direct",
  description: "Interactive demo: Component Demo Ai Prog Direct. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
