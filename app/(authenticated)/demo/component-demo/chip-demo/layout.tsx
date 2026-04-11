import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/chip-demo", {
  title: "Component Demo Chip Demo",
  description: "Interactive demo: Component Demo Chip Demo. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
