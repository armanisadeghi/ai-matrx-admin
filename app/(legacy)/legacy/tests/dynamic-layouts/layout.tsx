import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Dynamic Layouts",
  title: "Tests",
  description: "Dynamic layout composition tests",
  letter: "DL",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(
        process.cwd(),
        "app",
        "(legacy)",
        "legacy",
        "tests",
        "dynamic-layouts",
      )}
      moduleHome="/legacy/tests/dynamic-layouts"
      moduleName="Dynamic Layouts"
    >
      {children}
    </RouteHeaderData>
  );
}
