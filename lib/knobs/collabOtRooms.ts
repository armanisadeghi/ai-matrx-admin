import { knobString } from "@/lib/knobs/featureKnobs";
import { resolveSessionKnob } from "@/lib/scoped-config/sessionKnob";

/**
 * Which documents WITHOUT a co-editing room open one on the ordered log (COLLAB-DESIGN §12.2, §27).
 * `off` keeps the 0.6 relay for them; `new` opens rooms for items never saved; `all` for every item. An item whose
 * room already exists always opens on the ordered log, whatever the knob says.
 *
 * ONE KNOB PER PRODUCT so Docs can switch on alone: `collab.ot_rooms_docs` and `collab.ot_rooms_sheets`. Each
 * falls back to the shared `collab.ot_rooms` when its own row is missing. Organizations and people may override
 * their own rung, so the read goes through the effective (ladder-resolved) value first and the platform value second.
 */
export type OtRoomsValue = "off" | "new" | "all";
export type OtRoomsProduct = "docs" | "sheets";

const OWN: Record<OtRoomsProduct, { feature: string; key: string }> = {
  docs: { feature: "collab", key: "ot_rooms_docs" },
  sheets: { feature: "collab", key: "ot_rooms_sheets" },
};
const SHARED = { feature: "collab", key: "ot_rooms" };

type Ref = { feature: string; key: string };
export interface OtRoomsReaders {
  /** Ladder-resolved value (organization and person rungs); `undefined` when nothing answered. Throws on an unseeded row. */
  effective: (ref: Ref) => Promise<unknown>;
  /** Platform value of the register row. Throws on an unseeded row. */
  platform: (ref: Ref) => Promise<unknown>;
}

const defaultReaders: OtRoomsReaders = {
  effective: (ref) => resolveSessionKnob(ref),
  platform: (ref) => knobString(ref.feature, ref.key),
};

const asValue = (v: unknown): OtRoomsValue | null => (v === "off" || v === "new" || v === "all" ? v : null);

async function readOne(ref: Ref, readers: OtRoomsReaders): Promise<OtRoomsValue | null> {
  try {
    const eff = asValue(await readers.effective(ref));
    if (eff) return eff;
  } catch {
    // an unseeded row (or a refused read) is decided by the platform read below, which raises on a missing row
  }
  return asValue(await readers.platform(ref));
}

/** The product's own knob; the shared `collab.ot_rooms` when the product's row is missing; `off` when nothing answers. */
export async function readCollabOtRooms(product: OtRoomsProduct, readers: OtRoomsReaders = defaultReaders): Promise<OtRoomsValue> {
  try {
    const own = await readOne(OWN[product], readers);
    if (own) return own;
  } catch (err) {
    console.warn(`[collab] collab.${OWN[product].key} is not readable; using collab.ot_rooms`, err);
  }
  try {
    return (await readOne(SHARED, readers)) ?? "off";
  } catch (err) {
    console.warn("[collab] could not read collab.ot_rooms; items without a room keep the relay", err);
    return "off";
  }
}
