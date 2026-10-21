/**
 * A comment's anchor is a write into the document body (a COMMENT custom range). A seat that cannot edit has Univer's
 * Edit permission off (that is what refuses its typing), and Univer refuses the anchor's rich-text mutation with it, so
 * the person's comment never started (live, 2026-10-21: no anchor, no thread, no cmt_add). The anchor write — and only it —
 * runs with Edit lifted for that one synchronous call, then the previous value is put back. Typing, formatting and every
 * other command stay refused because nothing else runs inside the window.
 */
import { DOCUMENT_UNIT_PERMISSION_ACTIONS, getDocumentPermissionValue, setDocumentPermissionValue } from "@univerjs/docs";

/** Univer lists the unit actions as [Edit, Copy, Print, Export, Comment]; the first is the one that gates typing. */
const EDIT = DOCUMENT_UNIT_PERMISSION_ACTIONS[0]!;

type PermissionServiceLike = Parameters<typeof getDocumentPermissionValue>[0];

export function withEditLiftedForAnchor<T>(permissionService: PermissionServiceLike | null | undefined, unitId: string, mayComment: boolean, write: () => T): T {
  if (!permissionService || !mayComment || getDocumentPermissionValue(permissionService, unitId, unitId, EDIT)) return write();
  setDocumentPermissionValue(permissionService, unitId, unitId, EDIT, true);
  try {
    return write();
  } finally {
    setDocumentPermissionValue(permissionService, unitId, unitId, EDIT, false);
  }
}
