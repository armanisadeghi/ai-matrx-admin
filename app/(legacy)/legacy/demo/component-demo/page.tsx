import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ComponentDemoPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(legacy)",
        "legacy",
        "demo",
        "component-demo",
      )}
      basePath="/legacy/demo/component-demo"
      title="Component Demo"
    />
  );
}
