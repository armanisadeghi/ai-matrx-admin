// features/mandates/run-history/column-widths.ts
//
// Runs-table column widths. Pure.

/** Below this table width (a phone) Date, Result, Cost and Open shrink so Open stays on screen. */
export const PHONE_TABLE_PX = 480;

/** Column widths for the runs table; the phone set sums, with the select box, under 360 px. */
export function runColumnWidths(phone: boolean): { when: number; status: number; cost: number; open: number } {
  return phone
    ? { when: 64, status: 84, cost: 96, open: 64 }
    : { when: 118, status: 92, cost: 112, open: 84 };
}
