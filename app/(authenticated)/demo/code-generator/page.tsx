import { join } from "path";
import { Code2 } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function CodeGeneratorIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "demo",
        "code-generator",
      )}
      basePath="/demo/code-generator"
      title="Code generator demos"
      description="React live playground variants."
      icon={Code2}
    />
  );
}
