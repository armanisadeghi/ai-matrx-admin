import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function DemoPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "demo")}
      basePath="/demo"
      title="Demo"
    />
  );
}
