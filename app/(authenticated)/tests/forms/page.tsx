import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function FormsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "forms")}
            basePath="/tests/forms"
            title="Forms"
        />
    );
}
