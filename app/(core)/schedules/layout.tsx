import { CalendarClock } from "lucide-react";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/schedules", {
  title: "Schedules",
  description: "Create and manage scheduled agent and automation tasks.",
  letter: "SD",
});

export default async function SchedulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();

  if (!isAuthenticated) {
    // Guests never mount the schedules workspace (its roster fetch fails
    // without a session and renders an error panel). Server-side gate per the
    // module-landing-pages doctrine; replace with a real landing later.
    return (
      <ModuleSignInGate
        title="Schedules"
        route="/schedules"
        description="Run agents and automations on a schedule — create, monitor, and manage recurring tasks."
        icon={CalendarClock}
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
