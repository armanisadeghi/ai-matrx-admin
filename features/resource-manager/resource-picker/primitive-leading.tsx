import { PrimitiveTile, type PrimitiveId } from "@ai-matrx/icons/domain";

/**
 * The `leading` slot of a picker row, wearing a primitive's ONE identity
 * (color + icon owned only in `@ai-matrx/icons/domain`). Every per-type picker
 * uses this so a row matches the colored door it was opened from.
 */
export function primitiveLeading(primitive: PrimitiveId) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
      <PrimitiveTile primitive={primitive} size="md" />
    </span>
  );
}
