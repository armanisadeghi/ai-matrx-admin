import { join } from "path";
import { Boxes } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function DemoServicesIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "services",
      )}
      basePath="/demo/services"
      title="Service demos"
      description="Callback and reference manager experiments."
      icon={Boxes}
    />
  );
}
