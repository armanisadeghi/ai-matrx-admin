import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "App Shell",
  title: "Tests",
  description: "App shell layout and chrome tests",
  letter: "AS",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "tests",
        "app-shell-test",
      )}
      moduleHome="/tests/app-shell-test"
      moduleName="App Shell Test"
    >
      {children}
    </RouteHeaderData>
  );
}
