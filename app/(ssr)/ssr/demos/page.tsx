import { join } from "path";
import { MonitorPlay } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

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
