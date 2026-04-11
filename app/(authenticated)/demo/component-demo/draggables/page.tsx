import { join } from "path";
import { GripVertical } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo/component-demo/draggables", {
  title: "Component Demo Draggables",
  description: "Interactive demo: Component Demo Draggables. AI Matrx demo route.",
});

export default async function DraggablesDemosIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "component-demo",
        "draggables",
      )}
      basePath="/demo/component-demo/draggables"
      title="Draggable demos"
      description="Cards, photos, containers, and transform experiments."
      icon={GripVertical}
    />
  );
}
