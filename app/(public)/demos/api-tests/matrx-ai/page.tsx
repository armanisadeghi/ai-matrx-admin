import { join } from "path";
import { Bot } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function MatrxAiDemosIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(public)",
        "demos",
        "api-tests",
        "matrx-ai",
      )}
      basePath="/demos/api-tests/matrx-ai"
      title="Matrx AI demos"
      description="Agent, chat, conversation, dynamic API, and tools demos."
      icon={Bot}
    />
  );
}
