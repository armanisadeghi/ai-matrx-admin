import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function ResizableDemoPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "demo", "resizable-demo")}
      basePath="/demo/resizable-demo"
      title="Resizable Demo"
    />
  );
}
