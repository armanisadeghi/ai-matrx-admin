import { knobString } from "@/lib/knobs/featureKnobs";

/**
 * `collab.ot_rooms` (COLLAB-DESIGN §12.2): which documents WITHOUT a co-editing room open one on the ordered log.
 * `off` (the default) keeps the 0.6 relay for them; `new` opens rooms for documents never saved; `all` for every
 * document. A document whose room already exists always opens on the ordered log, whatever the knob says.
 */
export async function readCollabOtRooms(): Promise<"off" | "new" | "all"> {
  try {
    const v = await knobString("collab", "ot_rooms");
    return v === "all" || v === "new" ? v : "off";
  } catch (err) {
    console.warn("[collab] could not read collab.ot_rooms; documents without a room keep the relay", err);
    return "off";
  }
}
