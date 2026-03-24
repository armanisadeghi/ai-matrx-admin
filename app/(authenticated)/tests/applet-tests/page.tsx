import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function AppletTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "applet-tests")}
            basePath="/tests/applet-tests"
            title="Applet Tests"
        />
    );
}
