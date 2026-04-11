import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/radio-group", {
  title: "Component Demo Radio Group",
  description: "Interactive demo: Component Demo Radio Group. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
