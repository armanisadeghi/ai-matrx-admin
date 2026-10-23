import { FolderKanban } from "lucide-react";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/projects", {
  title: "Projects",
  description:
    "Long-running containers for tasks and resources across your org.",
  letter: "P",
});

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();

  if (!isAuthenticated) {
    // Guests never mount ProjectsHub (RLS returns nothing without a session,
    // leaving an empty/misleading workspace). Server-side gate per the
    // module-landing-pages doctrine; replace with a real landing later.
    return (
      <ModuleSignInGate
        title="Projects"
        route="/projects"
        description="Plan and track long-running work — tasks and resources — across your organization."
        icon={FolderKanban}
      />
    );
  }

  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
