"use client";

// features/marketing/components/brands/browse/BrandsListPage.tsx
//
// /marketing/brands/all — every brand on the canonical list shell. "Add brand" opens the SAME create
// body as /marketing/brands/new, in a window panel with "Open full page" (feature-pages contract, rule 3).

import { Globe, Plus, ScanSearch, User } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useOpenCreateBrandWindow } from "@/features/overlays/definitions/createBrandWindow.overlay";
import { MARKETING_WORKSPACE_ROUTES } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { forgetBrandListReads } from "./service";
import { brandListConfig } from "./listConfig";
import { BRAND_LIST_SURFACE } from "./surface";

export function BrandsListPage() {
  const openCreate = useOpenCreateBrandWindow();
  // The list is read in memory, so a brand made in the window needs the next read to be fresh.
  // One action list: the list header draws each verb, the frame's "…" carries every one.
  const actions: ListPageAction[] = [
    { id: "add", label: "Add brand", icon: Plus, primary: true, onPress: () => openCreate({ onWindowClose: () => forgetBrandListReads() }) },
    { id: "smart-add", label: "Smart Add", icon: ScanSearch, href: marketingRoutes.smartAddBrand() },
    { id: "smart-add-person", label: "Smart Add a person", icon: User, href: marketingRoutes.smartAddBrand({ mode: "person" }) },
    { id: "new-website", label: "New website", icon: Globe, href: marketingRoutes.newSite() },
  ];
  return (
    <>
      <RecordPageHeader level={{ name: "Brands" }} modes={MARKETING_WORKSPACE_ROUTES} activeModeHref="/marketing/brands/all" />
      <EntityListPage config={brandListConfig} surface={BRAND_LIST_SURFACE} actions={actions} />
    </>
  );
}
