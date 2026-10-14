import { KindRenderHarness } from "@ai-matrx/rich-content/kinds/react/render-harness";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export default async function ShapesWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Shapes"
        route="/shapes/all"
        description="Browse and manage the structured content shapes your agents produce and render."
      />
    );
  }
  // The Shape Studio (Preview, Test, Stream, Instances, playground) is a
  // render harness: no generic-floor sighting is filed from inside it.
  return <KindRenderHarness>{children}</KindRenderHarness>;
}
