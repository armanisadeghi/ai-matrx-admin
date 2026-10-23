"use client";

// app/(core)/pick-lists/[id]/StoreListPage.tsx — A PICK LIST'S PAGE.
//
// Every list lives in the record store as a Table of choices under the same id. The page reads the
// list ONCE here: the Choices view edits from that read, and the `matrx-user/pick-lists` agent surface
// is built from it (`pickListPageScope.ts`), so the agent sees exactly what the person sees. The
// Table view is the store's table page (the screen /data/<id> is); it owns the header there and mounts
// the deeper `matrx-user/data-tables` surface for the grid.

import { useEffect, useRef, useState } from "react";
import { ReadFailure } from "@ai-matrx/design-system";
import { RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";

import { PickListChoicesEditor } from "@/features/data-tables/pick-lists/components/PickListChoicesEditor";
import { getAccessibleLists, getListWithItems } from "@/features/data-tables/pick-lists/service";
import { buildListSurfaceWriteHandlers } from "@/features/data-tables/pick-lists/surface-write-handlers";
import {
  buildPickListPageScope,
  flattenPickListItems,
  type PickListLoad,
  type PickListPageView,
} from "@/features/data-tables/pick-lists/pickListPageScope";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { UnifiedDataTablePage } from "@/features/unified-data/table-page/UnifiedDataTablePage";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

const SURFACE_NAME = "matrx-user/pick-lists";

/** The list crumb's door: every other pick list, through the Pick lists index's own read, capped. */
async function pickListSiblings(listId: string): Promise<CrumbOption[]> {
  const lists = await getAccessibleLists();
  return lists.slice(0, SIBLINGS_MAX).map((l) => ({ label: l.list_name || "Untitled list", href: `/pick-lists/${l.id}`, active: l.id === listId }));
}

export function StoreListPage({ listId }: { listId: string }) {
  const userId = useAppSelector(selectUserId);
  const [view, setView] = useState<PickListPageView>("choices");
  const [load, setLoad] = useState<PickListLoad>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const list = await getListWithItems(listId);
      setLoad(list ? { state: "ready", list } : { state: "error", message: "This list could not be found." });
    } catch (e) {
      setLoad({ state: "error", message: e instanceof Error ? e.message : "The list could not be read." });
    }
  };

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    getListWithItems(listId).then(
      (list) => {
        if (live) setLoad(list ? { state: "ready", list } : { state: "error", message: "This list could not be found." });
      },
      (e: unknown) => {
        if (live) setLoad({ state: "error", message: e instanceof Error ? e.message : "The list could not be read." });
      },
    );
    return () => {
      live = false;
    };
  }, [listId, attempt]);

  // Write handlers resolve at Apply time, after the approval card: read the live list through a ref.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  const writeHandlers = buildListSurfaceWriteHandlers({
    resolveListId: () => listId,
    knownItemIds: () => {
      const current = loadRef.current;
      return current.state === "ready" ? flattenPickListItems(current.list).map((i) => i.id) : null;
    },
    // The owner edits the list; anyone else reads it (the scope's `list_is_owner`). Unknown until read.
    canEditList: () => {
      const current = loadRef.current;
      return current.state === "ready" ? userId != null && current.list.user_id === userId : null;
    },
    afterWrite: reload,
  });

  // The Table view writes the same choices through the store's table page; coming back to Choices
  // re-reads them, so the editor, the agent's scope and the archive check never run on the old read.
  const switchView = (next: PickListPageView) => {
    if (next === view) return;
    setView(next);
    if (next === "choices") {
      setFocusedItemId(null);
      void reload();
    }
  };

  const getScope = () => buildPickListPageScope({ listId, view, load, userId, focusedItemId });
  const getWriteHandlers = () => writeHandlers;

  const list = load.state === "ready" ? load.list : null;
  const choices = list ? flattenPickListItems(list).map((i) => ({ id: i.id, label: i.label })) : [];

  return (
    <SurfaceRuntimeProvider surfaceName={SURFACE_NAME} getScope={getScope} isEditable getWriteHandlers={getWriteHandlers}>
      <NonEditableContextMenu
        sourceFeature="udt"
        surfaceName={SURFACE_NAME}
        menuVersion={1}
        getApplicationScope={getScope}
        contentSource={{ type: "raw", title: list?.list_name ?? "Pick list" }}
        entity={list ? { type: "record", id: list.list_id, title: list.list_name, resourceType: "record" } : undefined}
      >
        <div className="flex h-full flex-col">
          {/* The Table view's table page owns the shell header (the table switcher); the Choices view names the list. */}
          {view === "choices" ? (
            <RecordPageHeader backHref="/pick-lists" record={{ name: list?.list_name, token: "record", id: listId, loadSiblings: () => pickListSiblings(listId) }} />
          ) : null}
          <div className="shrink-0 px-4 pb-1 pt-[calc(var(--shell-header-h)+0.25rem)]">
            <SegmentedControl
              value={view}
              aria-label="Pick list view"
              onValueChange={(v: string) => switchView(v === "table" ? "table" : "choices")}
              data={[
                { value: "choices", label: "Choices" },
                { value: "table", label: "Table" },
              ]}
            />
          </div>
          {/* The table page pads itself below the shell header; the switch above already sits there. */}
          <div className="min-h-0 flex-1 [--shell-header-h:0px]">
            {view === "table" ? (
              <UnifiedDataTablePage tableId={listId} />
            ) : load.state === "loading" ? (
              <div className="max-w-3xl px-4 pt-2">
                <RegionSkeleton shape="rows" count={5} aria-label="Loading the choices" />
              </div>
            ) : load.state === "error" ? (
              <ReadFailure error={new Error(load.message)} what="this list" onRetry={() => setAttempt((n) => n + 1)} />
            ) : (
              <PickListChoicesEditor listId={listId} choices={choices} reload={reload} onFocusChoice={setFocusedItemId} />
            )}
          </div>
        </div>
      </NonEditableContextMenu>
    </SurfaceRuntimeProvider>
  );
}
