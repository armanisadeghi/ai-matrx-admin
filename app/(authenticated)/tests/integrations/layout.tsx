import { join } from "path";
import { RouteHeaderData } from "@/components/ssr/RouteHeaderData";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <RouteHeaderData
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "integrations")}
            moduleHome="/tests/integrations"
            moduleName="Integrations"
        >
            {children}
        </RouteHeaderData>
    );
}
