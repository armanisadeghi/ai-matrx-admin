import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ComponentDemoPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "component-demo",
      )}
      basePath="/demo/component-demo"
      title="Component Demo"
    />
  );
}
