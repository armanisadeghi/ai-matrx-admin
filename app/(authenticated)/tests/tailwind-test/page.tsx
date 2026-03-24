import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function TailwindTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "tailwind-test")}
            basePath="/tests/tailwind-test"
            title="Tailwind Tests"
        />
    );
}
