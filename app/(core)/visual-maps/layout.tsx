import { Network } from "lucide-react";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";

export default async function VisualMapsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Visual map lab"
        route="/visual-maps/lab"
        description="Rendered diagrams with their screenshots, measurements and engine diagnostics."
        icon={Network}
      />
    );
  }
  return children;
}
