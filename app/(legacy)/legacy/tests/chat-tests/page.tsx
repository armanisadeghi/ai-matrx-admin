import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ChatTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(legacy)", "legacy", "tests", "chat-tests")}
            basePath="/legacy/tests/chat-tests"
            title="Chat Tests"
        />
    );
}
