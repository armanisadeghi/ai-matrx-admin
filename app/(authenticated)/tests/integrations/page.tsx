import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function IntegrationsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "integrations")}
            basePath="/tests/integrations"
            title="Integrations"
        />
    );
}
