import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RouteHeaderData
      directory={join(process.cwd(), "app", "(authenticated)", "tests", "dynamic-gateway-concept")}
      moduleHome="/tests/dynamic-gateway-concept"
      moduleName="Dynamic Gateway Concept"
    >
      {children}
    </RouteHeaderData>
  );
}
