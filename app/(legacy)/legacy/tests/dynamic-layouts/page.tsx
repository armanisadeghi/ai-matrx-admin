import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function DynamicLayoutsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "dynamic-layouts")}
            basePath="/legacy/tests/dynamic-layouts"
            title="Dynamic Layouts"
        />
    );
}
