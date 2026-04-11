import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog/basic", {
  title: "Component Demo Ai Prog Basic",
  description: "Interactive demo: Component Demo Ai Prog Basic. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
