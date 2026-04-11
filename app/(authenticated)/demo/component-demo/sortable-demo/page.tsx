import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function SortableDemoPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "component-demo",
        "sortable-demo",
      )}
      basePath="/demo/component-demo/sortable-demo"
      title="Sortable Demo"
    />
  );
}
