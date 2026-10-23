"use client";

import { Plus } from "lucide-react";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { rulebookListConfig } from "../listConfig";

export function MasterworkStudioPage() {
  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "new", label: "New Masterwork", icon: Plus, href: "/masterwork/new", primary: true },
  ];

  return (
    <EntityListPage
      config={rulebookListConfig}
      actions={actions}
    />
  );
}
