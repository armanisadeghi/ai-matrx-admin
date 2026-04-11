import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/checkbox-radio", {
  title: "Component Demo Checkbox Radio",
  description: "Interactive demo: Component Demo Checkbox Radio. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
