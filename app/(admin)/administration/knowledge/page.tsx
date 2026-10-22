import { AdminDomainLanding } from "@/features/admin/components/AdminDomainLanding";
import { StaticSurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/StaticSurfaceRuntimeProvider";
import { ADMIN_KNOWLEDGE_SURFACE_NAME, createAdminKnowledgeScope } from "@/features/surfaces/manifests/admin-knowledge.manifest";

export default function KnowledgeAdministrationPage() {
  return (
    <StaticSurfaceRuntimeProvider surfaceName={ADMIN_KNOWLEDGE_SURFACE_NAME} scope={createAdminKnowledgeScope({ knowledge_section: "hub" })}>
      <AdminDomainLanding domainSlug="knowledge" />
    </StaticSurfaceRuntimeProvider>
  );
}
