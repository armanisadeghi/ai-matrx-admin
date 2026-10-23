"use client";

// features/board/boards/BoardsListPage.tsx
//
// /board — every board you made, on the canonical list shell. "New board"
// creates one in the selected organization (the gate asks when none is
// selected) and opens it.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutTemplate, Loader2, Plus } from "lucide-react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";
import { ListPageActionButton, type ListPageAction } from "@/lib/entity-list/components/ListPageActions";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken, selectAuthReady, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useCreateBoard } from "../persistence/useCreateBoard";
import { AddToBoardRedirect } from "./AddToBoardRedirect";
import { boardListConfig } from "./listConfig";
import { BoardTemplateGallery } from "../templates/BoardTemplateGallery";

/** `/board?add=<key>` is an add, not a list: it opens the last-opened board and starts the item. */
export function BoardsListPage() {
  return (
    <Suspense fallback={null}>
      <BoardsRoute />
    </Suspense>
  );
}

function BoardsRoute() {
  const params = useSearchParams();
  const addKey = params.get("add");
  return addKey ? <AddToBoardRedirect addKey={addKey} addId={params.get("id")} /> : <BoardsList />;
}

function BoardsList() {
  const { creating, newBoard } = useCreateBoard();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const authReady = useAppSelector(selectAuthReady);
  const userId = useAppSelector(selectUserId);
  const accessToken = useAppSelector(selectAccessToken);
  const mayLoad = Boolean(authReady && userId && accessToken);

  // One action list: the list header draws each verb, the frame's "…" carries every one; the empty
  // state offers the same two.
  const actions: ListPageAction[] = [
    { id: "from-template", label: "From a template", icon: LayoutTemplate, onPress: () => setTemplatesOpen(true) },
    { id: "new", label: "New board", icon: creating ? Loader2 : Plus, primary: true, disabled: creating, onPress: () => void newBoard() },
  ];
  const emptyActions = (
    <span className="flex flex-wrap items-center justify-center gap-2">
      {actions.map((action) => (
        <ListPageActionButton key={action.id} action={action} />
      ))}
    </span>
  );

  return (
    <>
      <RecordPageHeader level={{ name: "Boards" }} />
      {mayLoad ? (
        <div className="contents matrx-touch-targets">
          <EntityListPage config={boardListConfig} actions={actions} emptyAction={emptyActions} />
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing you in…
        </div>
      )}
      <BoardTemplateGallery open={templatesOpen} onOpenChange={setTemplatesOpen} />
    </>
  );
}
