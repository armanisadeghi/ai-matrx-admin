import { OVERLAY_META_INDEX } from "./overlay-meta-index";

/** Every overlay id (plain data, derived from the generated metadata index; safe in server code). */
export const OVERLAY_ID_INDEX: Readonly<Record<string, true>> = Object.fromEntries(
  OVERLAY_META_INDEX.map((row) => [row.id, true] as const),
);
