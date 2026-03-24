import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(process.cwd(), "app", "(authenticated)", "tests", "app-shell-test")}
      moduleHome="/tests/app-shell-test"
      moduleName="App Shell Test"
    >
      {children}
    </RouteHeaderData>
  );
}
