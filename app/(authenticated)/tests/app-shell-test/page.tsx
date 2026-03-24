import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function AppShellTestPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "tests", "app-shell-test")}
      basePath="/tests/app-shell-test"
      title="App Shell Test"
    />
  );
}
