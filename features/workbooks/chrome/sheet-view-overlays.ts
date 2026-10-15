/**
 * View → Show → Formulas and Protected ranges. Univer has no switch for either, so both ride its cell
 * interceptor (`INTERCEPTOR_POINT.CELL_CONTENT`): what the canvas paints is changed, the cell data never is.
 * Turning a mode off removes its effect on the next paint, and nothing here reaches a save.
 */

import {
  FormulaDataModel,
  INTERCEPTOR_POINT,
  RangeProtectionRuleModel,
  SheetInterceptorService,
  WorksheetProtectionRuleModel,
} from "@univerjs/preset-sheets-core";

export interface ViewOverlayState {
  formulas: boolean;
  protectedRanges: boolean;
}

interface InjectorLike {
  get<T>(token: unknown): T;
}
type CellLike = { v?: unknown; t?: number; p?: unknown; s?: unknown; f?: string | null; si?: string | null } | null | undefined;
type Location = {
  unitId: string;
  subUnitId: string;
  row: number;
  col: number;
  workbook: { getStyles(): { getStyleByCell(cell: unknown): Record<string, unknown> | null | undefined } };
};

const PROTECTED_FILL = { rgb: "#fde7e9" };
const inRange = (r: { startRow: number; endRow: number; startColumn: number; endColumn: number }, row: number, col: number) =>
  row >= r.startRow && row <= r.endRow && col >= r.startColumn && col <= r.endColumn;

/** Pure: is this cell inside any of the protected ranges (or is the whole sheet protected)? */
export function isCellProtected(
  ranges: readonly { startRow: number; endRow: number; startColumn: number; endColumn: number }[],
  wholeSheet: boolean,
  row: number,
  col: number,
): boolean {
  return wholeSheet || ranges.some((r) => inRange(r, row, col));
}

/** Pure: the cell as the canvas should paint it for the current modes. */
export function paintedCell(cell: CellLike, formula: string | null | undefined, protectedCell: boolean, state: ViewOverlayState, baseStyle: Record<string, unknown> | null | undefined): CellLike {
  let out: CellLike = cell;
  if (state.formulas && formula) out = { ...(out ?? {}), v: formula, t: 1, p: null };
  if (state.protectedRanges && protectedCell) out = { ...(out ?? {}), s: { ...(baseStyle ?? {}), bg: PROTECTED_FILL } };
  return out;
}

/** Install the interceptor once for a Univer instance; returns a disposer. `state()` is read on every paint. */
export function installViewOverlays(injector: InjectorLike, state: () => ViewOverlayState): () => void {
  const interceptors = injector.get<InstanceType<typeof SheetInterceptorService>>(SheetInterceptorService);
  const formulaModel = injector.get<InstanceType<typeof FormulaDataModel>>(FormulaDataModel);
  const rangeRules = injector.get<InstanceType<typeof RangeProtectionRuleModel>>(RangeProtectionRuleModel);
  const sheetRules = injector.get<InstanceType<typeof WorksheetProtectionRuleModel>>(WorksheetProtectionRuleModel);
  const disposable = interceptors.intercept(INTERCEPTOR_POINT.CELL_CONTENT, {
    priority: 1000,
    handler: (cell: CellLike, location: Location, next: (c: CellLike) => CellLike) => {
      const s = state();
      if (!s.formulas && !s.protectedRanges) return next(cell);
      const formula = s.formulas ? (formulaModel.getFormulaStringByCell(location.row, location.col, location.subUnitId, location.unitId) ?? null) : null;
      let isProtected = false;
      let base: Record<string, unknown> | null | undefined = null;
      if (s.protectedRanges) {
        const rules = rangeRules.getSubunitRuleList(location.unitId, location.subUnitId);
        const ranges = rules.flatMap((r: { ranges?: { startRow: number; endRow: number; startColumn: number; endColumn: number }[] }) => r.ranges ?? []);
        const whole = !!sheetRules.getRule(location.unitId, location.subUnitId);
        isProtected = isCellProtected(ranges, whole, location.row, location.col);
        if (isProtected) base = location.workbook.getStyles().getStyleByCell(cell);
      }
      return next(paintedCell(cell, formula, isProtected, s, base));
    },
  } as never);
  return () => disposable.dispose();
}
