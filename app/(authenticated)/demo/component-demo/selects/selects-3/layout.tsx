import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/selects-3", {
  title: "Component Demo Selects Selects 3",
  description: "Interactive demo: Component Demo Selects Selects 3. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
