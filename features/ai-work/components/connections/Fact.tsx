import { PropertyRow } from "@ai-matrx/design-system/controls";

/**
 * One fact in a row's details panel. `PropertyRow`'s `missing` always draws the missing tag, so a
 * fact that may or may not be known passes its word here and gets the tag only when it is empty.
 */
export function Fact({ label, value, empty, mono, help }: { label: string; value: string | null | undefined; empty?: string; mono?: boolean; help?: string | undefined }) {
  const known = value !== null && value !== undefined && value !== "";
  return <PropertyRow label={label} {...(known ? { value, ...(mono ? { mono: true } : {}) } : { missing: empty ?? true })} {...(help ? { help } : {})} />;
}
