import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function AppletTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "applet-tests")}
            basePath="/legacy/tests/applet-tests"
            title="Applet Tests"
        />
    );
}
