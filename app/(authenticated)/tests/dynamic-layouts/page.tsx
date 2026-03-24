import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function DynamicLayoutsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "dynamic-layouts")}
            basePath="/tests/dynamic-layouts"
            title="Dynamic Layouts"
        />
    );
}
