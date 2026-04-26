import { join } from "path";
import { Puzzle } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ScraperUiDemosIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(legacy)",
        "legacy",
        "demo",
        "component-demo",
        "socket-form-builder",
        "scraper-ui",
      )}
      basePath="/legacy/demo/component-demo/socket-form-builder/scraper-ui"
      title="Scraper UI demos"
      description="Socket form builder scraper UI variants."
      icon={Puzzle}
    />
  );
}
