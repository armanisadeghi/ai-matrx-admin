import { createRouteMetadata } from "@/utils/route-metadata";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { MessagesSquare } from "lucide-react";

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
  // The module layout above draws the derived trail for every page here (crumb doors).
  return <>{children}</>;
}
