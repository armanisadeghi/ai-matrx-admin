import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Forms",
  title: "Tests",
  description: "Form component and validation tests",
  letter: "FT",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "tests",
        "forms",
      )}
      moduleHome="/legacy/tests/forms"
      moduleName="Forms"
    >
      {children}
    </RouteHeaderData>
  );
}
