import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/tests", {
  titlePrefix: "Relationships",
  title: "Tests",
  description: "Relationship management and entity link tests",
  letter: "RL",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "tests",
        "relationship-management",
      )}
      moduleHome="/legacy/tests/relationship-management"
      moduleName="Relationship Management"
    >
      {children}
    </RouteHeaderData>
  );
}
