"use client";

// features/canvas/maps/MapsListPage.tsx
//
// /maps — the library. Feature entry pages are LIST views (CLAUDE.md), so this
// is a list of everything you can open or make, never a forced editor.

import { useState } from "react";
import { Plus } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import type { ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAccessToken,
  selectAuthReady,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { mapListConfig } from "./listConfig";
import { NewMapDialog } from "./NewMapDialog";

export function canLoadMaps(input: {
  authReady: boolean;
  userId: string | null;
  accessToken: string | null;
}): boolean {
  return Boolean(input.authReady && input.userId && input.accessToken);
}

export function MapsListPage() {
  const [creating, setCreating] = useState(false);
  const authReady = useAppSelector(selectAuthReady);
  const userId = useAppSelector(selectUserId);
  const accessToken = useAppSelector(selectAccessToken);
  const mayLoad = canLoadMaps({ authReady, userId, accessToken });

  // The list's one verb: the header draws it, the frame's "…" carries it, the empty state offers it.
  const actions: ListPageAction[] = [
    { id: "new", label: "New map", icon: Plus, primary: true, onPress: () => setCreating(true) },
  ];

  return (
    <>
      <RecordPageHeader level={{ name: "Maps" }} />
      {mayLoad ? (
        <>
          <EntityListPage
            config={mapListConfig}
            actions={actions}
          />
          <NewMapDialog open={creating} onOpenChange={setCreating} />
        </>
      ) : (
        <div
          className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"
          role="status"
        >
          Loading your maps…
        </div>
      )}
    </>
  );
}
