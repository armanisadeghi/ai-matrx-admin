import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function RelationshipManagementPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "relationship-management")}
            basePath="/legacy/tests/relationship-management"
            title="Relationship Management"
        />
    );
}
