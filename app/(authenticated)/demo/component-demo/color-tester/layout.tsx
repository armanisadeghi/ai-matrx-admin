import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/color-tester", {
  title: "Component Demo Color Tester",
  description: "Interactive demo: Component Demo Color Tester. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
