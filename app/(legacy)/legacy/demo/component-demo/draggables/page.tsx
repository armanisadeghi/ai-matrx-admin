import { join } from "path";
import { GripVertical } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

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
      basePath="/legacy/demo/component-demo/draggables"
      title="Draggable demos"
      description="Cards, photos, containers, and transform experiments."
      icon={GripVertical}
    />
  );
}
