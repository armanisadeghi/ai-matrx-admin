import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/selects/next-ui-select", {
  title: "Component Demo Selects Next Ui Select",
  description: "Interactive demo: Component Demo Selects Next Ui Select. AI Matrx demo route.",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
