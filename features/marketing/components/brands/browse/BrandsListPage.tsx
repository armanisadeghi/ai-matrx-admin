"use client";

// features/marketing/components/brands/browse/BrandsListPage.tsx
//
// /marketing/brands/all — every brand on the canonical list shell. "Add brand" opens the SAME create
// body as /marketing/brands/new, in a window panel with "Open full page" (feature-pages contract, rule 3).

import { Plus } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { useOpenCreateBrandWindow } from "@/features/overlays/definitions/createBrandWindow.overlay";
import { MARKETING_WORKSPACE_ROUTES } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { forgetBrandListReads } from "./service";
import { brandListConfig } from "./listConfig";
import { BRAND_LIST_SURFACE } from "./surface";

export function BrandsListPage() {
  const openCreate = useOpenCreateBrandWindow();
  // The list is read in memory, so a brand made in the window needs the next read to be fresh.
  const add = () => openCreate({ onWindowClose: () => forgetBrandListReads() });
  const addButton = (
    <Button variant="primary" icon={<Plus className="h-4 w-4" />} collapse="container" onClick={add} aria-label="Add brand">
      Add brand
    </Button>
  );
  return (
    <>
      <RecordPageHeader record={{ name: "Brands" }} modes={MARKETING_WORKSPACE_ROUTES} activeModeHref="/marketing/brands/all" />
      <EntityListPage config={brandListConfig} surface={BRAND_LIST_SURFACE} headerActions={addButton} emptyAction={addButton} />
    </>
  );
}
