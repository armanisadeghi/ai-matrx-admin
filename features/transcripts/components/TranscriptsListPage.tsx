"use client";

// features/transcripts/components/TranscriptsListPage.tsx
//
// /transcripts — the SECOND consumer of the generic entity-list shell
// (lib/entity-list). Everything transcripts-specific lives in
// ../browse/listConfig.tsx; this file is the config plus this page's slots.
//
// Replaces the sectioned hub (per-kind queries, client-side sort/filter,
// bespoke 780-line table): rows now come from the trx_list_scoped RPC as ONE
// list with a `kind` column, paged/filtered/sorted/counted server-side.

import { Library, Plus } from "lucide-react";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { ListPageActionButton, type ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { transcriptListConfig } from "../browse/listConfig";
import { TranscriptsListHeader } from "./TranscriptsListHeader";
import { TranscriptsSurfaceGuide } from "./TranscriptsSurfaceGuide";
import { LIBRARIES_PATH } from "@/features/knowledge/modulePaths";

export function TranscriptsListPage() {
  // A WHOLE CHANNEL IS NOT FOUR MORE CLICKS OF "New". The four capture
  // surfaces all take one recording at a time; someone who already has
  // transcripts and wants a creator's entire back catalog has no door here
  // at all. Libraries is that door.
  //
  // It sits in the list's actions, NOT in TranscriptsSurfaceGuide: the guide
  // renders only inside the empty state, and the person this door is for — the
  // one who already has transcripts — never sees the empty state. A door only
  // the wrong audience can reach is a dead end with extra steps. One action
  // list: the list header draws each verb, the frame's "…" carries every one.
  const actions: ListPageAction[] = [
    { id: "whole-channel", label: "Whole channel", icon: Library, href: LIBRARIES_PATH },
    { id: "new", label: "New transcript", icon: Plus, href: "/transcripts/new", primary: true },
  ];

  // The empty state is the ONE place the surface wayfinding renders — it never
  // sits above the list, so a user with transcripts sees zero page shift.
  const emptyAction = (
    <>
      <span className="flex flex-wrap items-center justify-center gap-2">
        {actions.map((action) => (
          <ListPageActionButton key={action.id} action={action} />
        ))}
      </span>
      <TranscriptsSurfaceGuide />
    </>
  );

  return (
    <>
      <TranscriptsListHeader />
      <EntityListPage
        config={transcriptListConfig}
        actions={actions}
        emptyAction={emptyAction}
      />
    </>
  );
}
