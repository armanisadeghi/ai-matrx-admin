import { join } from "path";
import { FlaskConical } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function FeatureTestsPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(public)", "demos", "feature-tests")}
      basePath="/demos/feature-tests"
      title="Feature Tests"
      icon={FlaskConical}
      shallow
    />
  );
}
