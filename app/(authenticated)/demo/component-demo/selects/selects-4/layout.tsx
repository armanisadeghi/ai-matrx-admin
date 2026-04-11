import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/selects-4", {
  title: "Component Demo Selects Selects 4",
  description: "Interactive demo: Component Demo Selects Selects 4. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
