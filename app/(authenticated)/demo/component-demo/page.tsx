import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo", {
  title: "Component Demo",
  description: "Interactive demo: Component Demo. AI Matrx demo route.",
});

export default async function ComponentDemoPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "demo", "component-demo")}
      basePath="/demo/component-demo"
      title="Component Demo"
    />
  );
}
