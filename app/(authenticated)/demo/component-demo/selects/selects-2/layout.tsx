import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/selects-2", {
  title: "Component Demo Selects Selects 2",
  description: "Interactive demo: Component Demo Selects Selects 2. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
