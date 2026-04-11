import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Field",
  title: "Tests",
  description: "Form field component tests",
  letter: "FI",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "tests",
        "field-tests",
      )}
      moduleHome="/tests/field-tests"
      moduleName="Field Tests"
    >
      {children}
    </RouteHeaderData>
  );
}
