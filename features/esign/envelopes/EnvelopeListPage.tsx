"use client";

// features/esign/envelopes/EnvelopeListPage.tsx — /esign: every envelope I sent, was given, or
// must sign. Feature entry pages are LIST views (CLAUDE.md); sending starts from "Send".

import { Send } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken, selectAuthReady, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { envelopeListConfig } from "./listConfig";

export function EnvelopeListPage() {
  const authReady = useAppSelector(selectAuthReady);
  const userId = useAppSelector(selectUserId);
  const accessToken = useAppSelector(selectAccessToken);
  const mayLoad = Boolean(authReady && userId && accessToken);

  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "send", label: "Send for signature", icon: Send, href: "/esign/new", primary: true },
  ];

  return (
    <>
      <RecordPageHeader level={{ name: "E-Signatures" }} />
      {mayLoad ? (
        <EntityListPage config={envelopeListConfig} actions={actions} />
      ) : (
        <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground" role="status">
          Loading your envelopes…
        </div>
      )}
    </>
  );
}
