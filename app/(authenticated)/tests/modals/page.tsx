import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ModalsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "modals")}
            basePath="/tests/modals"
            title="Modals"
        />
    );
}
