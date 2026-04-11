import { join } from "path";
import { MonitorPlay } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ssr/demos", {
  title: "SSR Demos",
  description: "Interactive demo: SSR Demos. AI Matrx demo route.",
});

export default async function SsrDemosIndexPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(ssr)", "ssr", "demos")}
      basePath="/ssr/demos"
      title="SSR demos"
      description="Small SSR routes for buttons, headers, and speaker UI."
      icon={MonitorPlay}
    />
  );
}
