import { knobInt } from "@/lib/knobs/featureKnobs";

/** The collab anti-entropy period (ms) from the `collab.anti_entropy_interval_ms` feature knob; the realtime package's provider takes it as a reader. */
export const readCollabAntiEntropyMs = (): Promise<number> => knobInt("collab", "anti_entropy_interval_ms");
