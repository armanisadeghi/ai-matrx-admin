import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Sortable",
  title: "Demo",
  description: "Sortable lists and drag handles component demo.",
  letter: "So", // Sortable
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(process.cwd(), "app", "(legacy)", "legacy", "demo", "component-demo", "sortable-demo")}
      moduleHome="/legacy/demo/component-demo/sortable-demo"
      moduleName="Sortable Demo"
    >
      {children}
    </RouteHeaderData>
  );
}
