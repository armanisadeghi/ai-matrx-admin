"use client";

// features/assists/mobileInbox.ts
//
// 🚨 ON A PHONE, ASSISTS NEVER FLOAT OVER THE PAGE (Arman, 2026-10-15). A 44pt
// lightbulb in the bottom corner sat on a busy conversation beside the scroll
// arrows and the composer, on a screen with no room to spare. A phone shows
// assists the way phone apps show an inbox: a row with its count in the
// header's ⋮ sheet (HeaderPhoneOverflow), whose dot lights when assists wait.
// The row opens the same canonical assists Drawer AssistsDock renders.
//
// The count is DERIVED from the same Redux rows and synced presentation cycle
// the dock reads — no second store, no copy of the count.

import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectPendingAssists } from "./redux/assistsSlice";
import { useAssistsPrefs } from "./hooks/useAssistsPrefs";
import { presentedAssists } from "./presentation-cycle";

/** Fired by the phone header's Assists row; AssistsDock opens its Drawer. */
export const ASSISTS_OPEN_EVENT = "matrx:assists-open";

export function openAssistsInbox(): void {
  window.dispatchEvent(new Event(ASSISTS_OPEN_EVENT));
}

/** How many assists the person would see right now (0 while quiet). */
export function useAssistsInboxCount(): number {
  const userId = useAppSelector(selectUserId);
  const pending = useAppSelector(selectPendingAssists);
  const { quiet, presentationCycle } = useAssistsPrefs();
  if (!userId || quiet) return 0;
  return presentedAssists(pending, presentationCycle).length;
}
