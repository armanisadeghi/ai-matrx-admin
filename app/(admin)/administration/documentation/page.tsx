import { AdminDomainLanding } from "@/features/admin/components/AdminDomainLanding";
import { StaticSurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/StaticSurfaceRuntimeProvider";
import { ADMIN_DOCUMENTATION_SURFACE_NAME, createAdminDocumentationScope } from "@/features/surfaces/manifests/admin-documentation.manifest";

export default function DocumentationAdministrationPage() {
  return (
    <StaticSurfaceRuntimeProvider surfaceName={ADMIN_DOCUMENTATION_SURFACE_NAME} scope={createAdminDocumentationScope({ documentation_section: "hub" })}>
      <AdminDomainLanding domainSlug="documentation" />
    </StaticSurfaceRuntimeProvider>
  );
}
