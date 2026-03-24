import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(process.cwd(), "app", "(authenticated)", "demo", "component-demo", "sortable-demo")}
      moduleHome="/demo/component-demo/sortable-demo"
      moduleName="Sortable Demo"
    >
      {children}
    </RouteHeaderData>
  );
}
