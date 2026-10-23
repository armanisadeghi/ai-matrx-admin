"use client";

// features/esign/templates/TemplatesPage.tsx — /esign/templates: every template I can use.

import { LayoutTemplate } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken, selectAuthReady, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { templateListConfig } from "./listConfig";

export function TemplatesPage() {
  const ready = useAppSelector(selectAuthReady) && !!useAppSelector(selectUserId) && !!useAppSelector(selectAccessToken);
  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "new", label: "New template", icon: LayoutTemplate, href: "/esign/templates/new", primary: true },
  ];
  return (
    <>
      <RecordPageHeader backHref="/esign" parents={[{ label: "E-Signatures", href: "/esign" }]} level={{ name: "Templates" }} />
      {ready ? (
        <EntityListPage config={templateListConfig} actions={actions} />
      ) : (
        <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground" role="status">
          Loading your templates…
        </div>
      )}
    </>
  );
}
