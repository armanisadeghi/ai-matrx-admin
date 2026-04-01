import { join } from "path";
import { TestTube } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ApiTestsIndexPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(public)", "demos", "api-tests")}
      basePath="/demos/api-tests"
      title="API tests"
      description="Public demo routes for agents, chat, health, PDF, tools, and Matrx AI subsets."
      icon={TestTube}
    />
  );
}
