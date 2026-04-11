import { join } from "path";
import { Braces } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/ai-prog", {
  title: "Component Demo Ai Prog",
  description: "Interactive demo: Component Demo Ai Prog. AI Matrx demo route.",
});

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
      basePath="/demo/component-demo/ai-prog"
      title="AI programming demos"
      description="Code editor, streaming diff, and related component experiments."
      icon={Braces}
    />
  );
}
