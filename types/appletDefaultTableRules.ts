/**
 * Leaf constant — no dependency on customAppTypes/field-constants.
 * Stays structurally compatible with `TableRules` in customAppTypes.
 */
export const defaultTableRules = {
  canAddRows: true,
  canDeleteRows: true,
  canAddColumns: true,
  canDeleteColumns: true,
  canEditCells: true,
  canRenameColumns: true,
  canSortRows: true,
  canSortColumns: true,
} as const;
