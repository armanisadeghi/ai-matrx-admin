/**
 * What a workbook seat tells its collab room about itself.
 *
 * Each seat mounts its OWN Univer unit, so a peer's mutation (addressed to the
 * sender's unit id) must be re-addressed to this seat's unit before it is
 * applied (`unitId`), and a mutation that cannot be applied here must say so
 * and re-sync rather than leave this seat quietly diverged (`onApplyFailed`).
 * The Docs editor does the same through its document model; the workbook
 * editor takes both from here so the two cannot drift.
 */
export type WorkbookSeatApi = {
  getActiveWorkbook?: () => { getId?: () => string } | null | undefined;
} | null | undefined;

export function workbookSeatOptions(args: {
  getApi: () => WorkbookSeatApi;
  /** Tell the person, then re-sync from the last saved version. */
  onFailed: (mutationId: string, error: unknown) => void;
}): {
  unitId: () => string | null;
  onApplyFailed: (mutationId: string, error: unknown) => void;
} {
  return {
    unitId: () => args.getApi()?.getActiveWorkbook?.()?.getId?.() ?? null,
    onApplyFailed: args.onFailed,
  };
}
