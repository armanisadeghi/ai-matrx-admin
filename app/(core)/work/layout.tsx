import { Workflow } from "lucide-react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/work", {
  title: "AI Work",
  description:
    "Browse, continue, organize, and configure AI work across AI Matrx and connected coding platforms.",
});

export default async function WorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();

  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="AI Work"
        route="/work"
        description="Browse and organize AI Matrx work and conversations captured from connected coding platforms."
        icon={Workflow}
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
