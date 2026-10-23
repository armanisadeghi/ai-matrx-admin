"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { initiativeListConfig } from "./listConfig";
import { InitiativeEditorDialog } from "./InitiativeEditorDialog";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createMarketingInitiativesScope } from "@/features/surfaces/manifests/marketing-initiatives.manifest";

export function InitiativesListPage({
  brandName,
}: {
  /**
   * 🚨 BRAND SCOPE (2026-08-30). This list is ORG-scoped by design, and the
   * brand route mounted it with nothing — so `/marketing/brands/<brand>/planning/
   * initiatives` opened on "All brands" and showed every OTHER brand's goals,
   * timelines and budgets inside that brand's workspace. Mounted from a brand
   * it now opens pre-filtered to that brand. It stays a DEFAULT rather than a
   * hidden predicate: the facet still carries every brand's true count and the
   * user can widen it deliberately (THE DOOR LAW), which a silent SQL filter
   * would quietly lie about.
   */
  brandName?: string | null;
} = {}) {
  const [creating, setCreating] = useState(false);
  const orgId = useAppSelector(selectActiveOrganizationId);
  const scopedConfig = useMemo<typeof initiativeListConfig>(
    () =>
      brandName
        ? {
            ...initiativeListConfig,
            defaultFilters: {
              brand_name: { kind: "select" as const, values: [brandName] },
            },
          }
        : initiativeListConfig,
    [brandName],
  );
  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "new", label: "New initiative", icon: Plus, primary: true, onPress: () => setCreating(true) },
  ];
  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/marketing-initiatives"
      getScope={() => createMarketingInitiativesScope({ page_kind: "list" })}
    >
      <RecordPageHeader level={{ name: "Initiatives" }} />
      <EntityListPage
        config={scopedConfig}
        actions={actions}
      />
      <InitiativeEditorDialog
        open={creating}
        onOpenChange={setCreating}
        organizationId={orgId}
        onSaved={() => window.location.reload()}
      />
    </SurfaceRuntimeProvider>
  );
}
