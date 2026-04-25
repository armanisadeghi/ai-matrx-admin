import { join } from "path";
import { Network } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/many-to-many-ui", {
  title: "Many To Many Ui",
  description: "Interactive demo: Many To Many Ui. AI Matrx demo route.",
});

export default async function ManyToManyUiIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "many-to-many-ui",
      )}
      basePath="/legacy/demo/many-to-many-ui"
      title="Many-to-many UI"
      description="Provider/UI experiments (Claude, Grok variants)."
      icon={Network}
    />
  );
}
