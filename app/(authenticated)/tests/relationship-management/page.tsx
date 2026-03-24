import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function RelationshipManagementPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "relationship-management")}
            basePath="/tests/relationship-management"
            title="Relationship Management"
        />
    );
}
