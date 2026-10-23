import { Globe } from "lucide-react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/cms", {
  title: "Content",
  description: "Manage websites, pages, and CMS content.",
  letter: "Cm",
});

/**
 * Server-side auth branch (module-landing-pages doctrine): guests must never
 * see the CMS workspace's client-side load errors. No CmsLanding exists yet,
 * so the shared sign-in gate covers /cms and every sub-route.
 */
export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Content"
        route="/cms"
        description="Manage websites, pages, and CMS content for your client sites."
        icon={Globe}
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
