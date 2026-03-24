import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function SocketTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "socket-tests")}
            basePath="/tests/socket-tests"
            title="Socket Tests"
        />
    );
}
