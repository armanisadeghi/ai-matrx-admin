"use client";

// features/vision-interview/components/VisionInterviewListPage.tsx
//
// /vision-interview — the feature's entry LIST page on the canonical
// entity-list shell (config: ../browse/listConfig.tsx).

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { sessionListConfig } from "../browse/listConfig";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { Plus } from "lucide-react";

export function VisionInterviewListPage() {
  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "new", label: "New interview", icon: Plus, href: "/masterwork/vision-interview/new", primary: true },
  ];

  return (
    <>
      <RecordPageHeader level={{ name: "Vision Interviews" }} />
      <EntityListPage
        config={sessionListConfig}
        actions={actions}
      />
    </>
  );
}
