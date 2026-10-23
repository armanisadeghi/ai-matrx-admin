import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRouteMetadata } from "@/utils/route-metadata";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { isNewUser, welcomeRedirectHref } from "@/utils/onboarding";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/dashboard", {
  title: "Dashboard",
  description: "Your central hub for all activities and insights",
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // First-login funnel: new users (onboarding not yet completed) get the
  // simpler /welcome screen instead of the full dashboard. The flag lives on
  // user_metadata, so this reuses the request-cached getUser() — no extra
  // query. Once the flag flips, this falls through and the dashboard renders.
  const { user } = await getSessionVerdict();
  // The query rides along (a notice's `?panels=welcome-found` must still open its window on /welcome).
  if (user && isNewUser(user)) {
    redirect(welcomeRedirectHref((await headers()).get("x-search-params")));
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
