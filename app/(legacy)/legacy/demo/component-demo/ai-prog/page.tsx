import { join } from "path";
import { Braces } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function AiProgDemosIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "component-demo",
        "ai-prog",
      )}
      basePath="/legacy/demo/component-demo/ai-prog"
      title="AI programming demos"
      description="Code editor, streaming diff, and related component experiments."
      icon={Braces}
    />
  );
}
