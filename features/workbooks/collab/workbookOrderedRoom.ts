/**
 * A workbook seat on the ordered co-editing log (COLLAB-DESIGN §6, unit C6): this editor's Univer services lent to
 * the office package's Sheets room. Host-side only — the package owns capture, transform, saves and restore;
 * this file resolves Univer's services with the app's own tokens, and says what a co-editing notice means in
 * plain words. Loaded on demand with the room (it pulls Yjs through `@ai-matrx/office/univer/collab`).
 */
import { ICommandService, IResourceLoaderService, IUndoRedoService, IUniverInstanceService, type Univer } from "@univerjs/core";
import { IDefinedNamesService } from "@univerjs/engine-formula";
import { IEditorBridgeService, SelectionMoveType, SheetsSelectionsService } from "@univerjs/preset-sheets-core";
import { SheetsFilterService } from "@univerjs/preset-sheets-filter";
import type { AwarenessState, OpOfflineState, OpSessionIncident } from "@ai-matrx/data/realtime/collab";
import {
  editorBridgeCell,
  filterServiceRange,
  startWorkbookOtRoom,
  univerSheetsOtPort,
  type SheetsCommandService,
  type SheetSelection,
  type SheetsOtNotice,
  type SheetsWorkbookLike,
  type WorkbookOtRoomHandle,
} from "@ai-matrx/office/univer/collab";

import { toast } from "@/components/ui/use-toast";
import { showOfflineNotice } from "@/lib/collab/offlineNotice";
import { notSharedNotice, resyncedNotice } from "@/lib/collab/seat-notices";

/** What a co-editing notice says, in plain words (our toast). */
export function showWorkbookCollabNotice(n: SheetsOtNotice): void {
  if (showOfflineNotice(n, "workbook")) return;
  switch (n.kind) {
    case "rolled_back":
      if (n.reason === "replace") {
        toast({ title: "A version was restored", description: "Your last few changes weren't kept." });
        return;
      }
      if (n.reason === "opening" || n.reason === "rebuild") {
        toast({ title: n.reason === "opening" ? "Still connecting" : "Catching up", description: "Your last few changes weren't kept." });
        return;
      }
      toast({ title: "Your last change was undone", description: "It clashed with a change someone else made at the same moment.", variant: "destructive" });
      return;
    case "overridden":
      toast({ title: "Someone changed the same cells", description: "Their change came in last, so it was kept." });
      return;
    case "dropped":
      toast({ title: "Part of your change was removed", description: "Someone deleted those rows or columns at the same moment." });
      return;
    case "read_only":
      toast({ title: "This workbook stopped syncing", description: "Reload the page to keep editing.", variant: "destructive" });
      return;
    case "not_shared":
      toast(notSharedNotice(n.mutationId));
      return;
    case "not_live":
      toast({ title: "Reconnecting", description: "Your last change was made while reconnecting and was not kept." });
      return;
    case "resynced":
      toast(resyncedNotice());
      return;
  }
}

export interface WorkbookOrderedRoomArgs {
  univer: Univer;
  workbookId: string;
  uid: string;
  clientId: string;
  displayName?: string;
  avatarUrl?: string | null;
  /** The unit id of the workbook this editor shows now. */
  unitId: () => string | null;
  /** Replace the shown workbook's whole content, keeping its unit id (the editor's guarded swap). */
  load: (snapshot: unknown) => void;
  /** Ask for the editor's coalesced save (the room decides whether this seat writes). */
  markDirty: () => void;
  readAntiEntropyIntervalMs?: () => Promise<number>;
  onAwareness: (states: Map<number, AwarenessState>) => void;
  /** C10: the chrome's offline state. */
  onOffline?: (state: OpOfflineState) => void;
}

export async function startWorkbookOrderedRoom(a: WorkbookOrderedRoomArgs): Promise<WorkbookOtRoomHandle> {
  const injector = a.univer.__getInjector();
  const commandService = injector.get(ICommandService) as unknown as SheetsCommandService;
  const instances = injector.get(IUniverInstanceService);
  const undo = injector.get(IUndoRedoService);
  const loader = injector.get(IResourceLoaderService);
  const definedNames = injector.get(IDefinedNamesService);
  const selections = injector.get(SheetsSelectionsService);
  const activeSheetId = () => {
    const id = a.unitId();
    const wb = id ? (instances.getUnit(id) as unknown as { getActiveSheet?: () => { getSheetId(): string } | null } | undefined) : undefined;
    return wb?.getActiveSheet?.()?.getSheetId() ?? null;
  };
  const port = univerSheetsOtPort({
    commandService,
    workbook: () => {
      const id = a.unitId();
      return id ? ((instances.getUnit(id) as unknown as SheetsWorkbookLike | undefined) ?? null) : null;
    },
    definedNames: (unitId) => definedNames.getDefinedNameMap(unitId) as Record<string, { name?: string }> | undefined,
    saveUnit: (unitId) => loader.saveUnit(unitId),
    undoRedo: () => undo,
    // Univer's filter grows its own range under a value written below it (no mutation): the port sends that growth
    // and keeps a peer's write from growing it again here (office C5e). The package's one reader keeps `rangeType`.
    filterRange: filterServiceRange(() => injector.get(SheetsFilterService)),
    // the cell an open cell editor is on: a peer's write to that cell waits until it closes, so it never splices into
    // what the person is typing (office COLLAB-DESIGN §26.1)
    cellEditor: () => {
      try {
        return editorBridgeCell(injector.get(IEditorBridgeService))();
      } catch {
        return null; // no sheets-ui editor bridge (yet)
      }
    },
    // a peer's row/column change carries this seat's selection along, never past the sheet's edge
    selections: {
      sheetId: activeSheetId,
      get: () => {
        const id = a.unitId();
        const sheet = activeSheetId();
        return id && sheet ? (selections.getWorkbookSelections(id).getSelectionsOfWorksheet(sheet) as unknown as SheetSelection[]) : null;
      },
      set: (next) => {
        const id = a.unitId();
        const sheet = activeSheetId();
        if (id && sheet) selections.getWorkbookSelections(id).setSelections(sheet, next as never, SelectionMoveType.ONLY_SET);
      },
    },
    load: a.load,
    markDirty: a.markDirty,
  });
  return startWorkbookOtRoom(port, {
    workbookId: a.workbookId,
    uid: a.uid,
    clientId: a.clientId,
    ...(a.displayName ? { displayName: a.displayName } : {}),
    ...(a.avatarUrl ? { avatarUrl: a.avatarUrl } : {}),
    ...(a.readAntiEntropyIntervalMs ? { readAntiEntropyIntervalMs: a.readAntiEntropyIntervalMs } : {}),
    onAwareness: a.onAwareness,
    onNotice: showWorkbookCollabNotice,
    ...(a.onOffline ? { onOffline: a.onOffline } : {}),
    onIncident: (i: OpSessionIncident) => console.warn(`[workbook] co-editing incident ${i.kind} at rev ${i.rev}`, i.detail ?? ""),
  });
}
