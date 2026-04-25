import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function MarkdownTestsPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "markdown-tests")}
      basePath="/legacy/tests/markdown-tests"
      title="Markdown Tests"
    />
  );
}
