/**
 * A Sheets seat without edit access cannot change a cell. The lock is Univer's own Edit permission on the workbook
 * (`WorkbookEditablePermission`): typing, paste, formatting, row/column edits and every cell write are refused by Univer;
 * selecting a cell, scrolling, and the comment anchor (a Matrx mutation outside Univer's cell commands) keep working.
 * Univer's own "no permission" dialog stays off; the seat is told in our words (`seat-notices`).
 */
import { ErrorService, IPermissionService, IUniverInstanceService, UniverInstanceType, type Workbook } from "@univerjs/core";
import { SheetPermissionCheckController, WorkbookEditablePermission } from "@univerjs/sheets";

type Injector = { get<T>(token: unknown): T };
type Sub = { unsubscribe(): void };

/**
 * The id of the workbook this seat is looking at. Univer 1.x names the lookup `getCurrentUnitOfType` (0.x called it
 * `getCurrentUnitForType`; calling the old name crashed every commenter and viewer on open, 2026-10-22).
 */
export function currentSheetUnitId(injector: Injector): string | null {
  const instances = injector.get<IUniverInstanceService>(IUniverInstanceService);
  return instances.getCurrentUnitOfType<Workbook>(UniverInstanceType.UNIVER_SHEET)?.getUnitId() ?? null;
}

/** Sets the workbook's Edit permission point (adds it first when Univer has not yet). */
export function setWorkbookEditable(injector: Injector, unitId: string, editable: boolean): void {
  const permissions = injector.get<{
    getPermissionPoint(id: string): unknown;
    addPermissionPoint(p: unknown): void;
    updatePermissionPoint(id: string, value: boolean): void;
  }>(IPermissionService);
  const point = new WorkbookEditablePermission(unitId);
  if (!permissions.getPermissionPoint(point.id)) permissions.addPermissionPoint(point);
  permissions.updatePermissionPoint(point.id, editable);
}

/**
 * Lock the workbook for this seat and call `onDenied` whenever Univer refuses a change. Returns the undo (the seat
 * becomes editable again and Univer's own notices come back).
 */
export function lockWorkbookSeat(injector: Injector, unitId: string, onDenied: () => void): () => void {
  setWorkbookEditable(injector, unitId, false);
  const permissions = injector.get<{ setShowComponents?(show: boolean): void }>(IPermissionService);
  permissions.setShowComponents?.(false);
  const subs: Sub[] = [];
  const check = injector.get<{ triggerPermissionUIEvent$?: { subscribe(fn: () => void): Sub } } | undefined>(SheetPermissionCheckController);
  if (check?.triggerPermissionUIEvent$) subs.push(check.triggerPermissionUIEvent$.subscribe(onDenied));
  const errors = injector.get<{ error$?: { subscribe(fn: (e: { code?: string }) => void): Sub } } | undefined>(ErrorService);
  if (errors?.error$) subs.push(errors.error$.subscribe((e) => e.code === "PERMISSION_DENIED" && onDenied()));
  return () => {
    for (const s of subs) s.unsubscribe();
    permissions.setShowComponents?.(true);
    setWorkbookEditable(injector, unitId, true);
  };
}
