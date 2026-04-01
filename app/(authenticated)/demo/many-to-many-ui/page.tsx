import { join } from "path";
import { Network } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

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
      basePath="/demo/many-to-many-ui"
      title="Many-to-many UI"
      description="Provider/UI experiments (Claude, Grok variants)."
      icon={Network}
    />
  );
}
