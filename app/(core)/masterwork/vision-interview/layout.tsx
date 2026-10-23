import { createRouteMetadata } from "@/utils/route-metadata";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { MessagesSquare } from "lucide-react";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/masterwork/vision-interview", {
  title: "Vision Interview",
  description:
    "Turn an idea into a clear, build-ready vision through a guided interview.",
  canonicalPath: "/masterwork/vision-interview",
});

export default async function VisionInterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Vision Interview"
        route="/masterwork/vision-interview"
        description="Turn an idea into a clear, build-ready vision through a guided interview."
        icon={MessagesSquare}
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
