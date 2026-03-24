import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ChatTestsPage() {
    return (
        <RouteIndexPage
            directory={join(process.cwd(), "app", "(authenticated)", "tests", "chat-tests")}
            basePath="/tests/chat-tests"
            title="Chat Tests"
        />
    );
}
