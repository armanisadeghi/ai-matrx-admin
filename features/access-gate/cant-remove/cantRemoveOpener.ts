/**
 * cantRemoveOpener — THE imperative door to "you can't remove this: ask the
 * owner, or hide it for me" (2026-10-14). Any code that tried to archive or
 * delete a record the person may not remove calls `offerOwnerChoices(...)`;
 * the summon overlay `cantRemoveDialog` shows `GovernedActionDialog`, asked
 * through `requestOverlay` — never re-implemented here.
 */

import { requestOverlay } from "@/features/overlays/requestOverlay";
import { isGovernedActionDenial } from "@/features/access-gate/lib/governedActionError";
import { fetchRemovalRights } from "@/features/access-gate/service/hiddenByMe";

export interface CantRemoveRequest {
  /** Platform entity token (`web_brand`, `note`, …). */
  token: string;
  id: string;
  /** The record as a person says it ("Kiln log"). */
  itemName: string;
  /** The kind as a person says it ("note"). */
  itemLabel: string;
  action: "archive" | "delete";
  href?: string | null;
}

/** "hidden" when the person hid it for themselves; "closed" otherwise. */
export type CantRemoveOutcome = "hidden" | "closed";

/** Thrown by a removal path that checked first and found the record isn't the person's to remove. */
export class RemovalNotYoursError extends Error {
  readonly token: string;
  readonly id: string;
  constructor(token: string, id: string) {
    super("Removing this is up to its owner.");
    this.name = "RemovalNotYoursError";
    this.token = token;
    this.id = id;
  }
}

/** True for a check-first refusal or the database's governed refusal. */
export function isRemovalNotYours(error: unknown): boolean {
  return error instanceof RemovalNotYoursError || isGovernedActionDenial(error);
}

/** One open screen per record: a double click never queues the same screen twice. */
const showing = new Set<string>();
function openOnce(request: CantRemoveRequest) {
  const key = `${request.token}:${request.id}`;
  if (showing.has(key)) return;
  showing.add(key);
  void requestOverlay<CantRemoveRequest, CantRemoveOutcome>("cantRemoveDialog", request, { cancel: "closed" })
    .catch(() => undefined)
    .finally(() => showing.delete(key));
}

/**
 * When `error` means "not yours to remove", open the owner-choices screen and
 * answer true (the caller shows nothing else). Otherwise answer false.
 */
export function offerOwnerChoices(
  error: unknown,
  request: CantRemoveRequest,
): boolean {
  if (!isRemovalNotYours(error)) return false;
  openOnce(request);
  return true;
}

/**
 * CHECK FIRST, before any archive/delete confirm: answers true when the person
 * may remove the record (show your confirm), or opens the owner-choices screen
 * and answers false. An unreadable answer is true — the write's own refusal
 * still lands on `offerOwnerChoices`.
 */
export async function ensureRemovable(request: CantRemoveRequest): Promise<boolean> {
  const rights = await fetchRemovalRights(request.token, request.id).catch(() => null);
  if (rights?.canView && !rights.canRemove) {
    openOnce(request);
    return false;
  }
  return true;
}
