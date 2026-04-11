import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/sortable-demo", {
  title: "Component Demo Sortable Demo",
  description: "Interactive demo: Component Demo Sortable Demo. AI Matrx demo route.",
});

export default async function SortableDemoPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "demo", "component-demo", "sortable-demo")}
      basePath="/demo/component-demo/sortable-demo"
      title="Sortable Demo"
    />
  );
}
