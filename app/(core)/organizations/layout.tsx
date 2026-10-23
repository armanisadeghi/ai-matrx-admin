import { Building2 } from "lucide-react";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/organizations", {
  title: "Organizations",
  description: "The organizations you belong to.",
  letter: "O",
});

export default async function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();

  if (!isAuthenticated) {
    // Guests never mount the org workspace (its client tree renders empty /
    // error states without a session). Server-side gate per the
    // module-landing-pages doctrine; replace with a real landing later.
    return (
      <ModuleSignInGate
        title="Organizations"
        route="/organizations"
        description="The organizations you belong to — members, scopes, and settings in one place."
        icon={Building2}
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
