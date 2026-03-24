import { join } from "path";
import { FolderOpen } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function DemosPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(public)", "demos")}
      basePath="/demos"
      title="Demos"
      icon={FolderOpen}
    />
  );
}
