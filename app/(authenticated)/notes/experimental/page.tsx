import { join } from "path";
import { FlaskConical } from "lucide-react";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function NotesExperimentalIndexPage() {
  return (
    <RouteIndexPage
      directory={join(
        process.cwd(),
        "app",
        "(authenticated)",
        "notes",
        "experimental",
      )}
      basePath="/notes/experimental"
      title="Notes — experimental"
      description="In-progress note experiments (unfinished work lives here so it stays discoverable)."
      icon={FlaskConical}
    />
  );
}
