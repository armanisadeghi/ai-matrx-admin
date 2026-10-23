import { Package } from "lucide-react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/artifacts", {
  title: "Artifacts",
  description: "Browse and manage CMS content artifacts and reusable blocks.",
  letter: "AF",
});

// Guests must never see the workspace tree (its artifact list fetch is
// user-scoped and surfaces an error panel for anonymous visitors). Branch
// server-side, per the module-landing-pages doctrine.
export default async function ArtifactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Artifacts"
        route="/artifacts"
        description="Your content library — reusable artifacts and blocks created across your workspace."
        icon={Package}
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
