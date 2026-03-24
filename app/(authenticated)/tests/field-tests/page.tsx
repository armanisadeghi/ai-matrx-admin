import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function FieldTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "field-tests")}
            basePath="/tests/field-tests"
            title="Field Tests"
        />
    );
}
