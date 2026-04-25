import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function FormsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "forms")}
            basePath="/legacy/tests/forms"
            title="Forms"
        />
    );
}
