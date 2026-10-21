/**
 * Two people's carets at the same spot would draw their name flags on top of each other (adv walk 2026-10-21: "admin" over
 * "Automated Live Tests"). Carets that stand within a few pixels of one another get consecutive slots, so their flags stack
 * one above the next instead of overlapping. Order is the carets' own order, so a flag never jumps between slots.
 */
export const FLAG_HEIGHT = 16;
const NEAR_X = 6;
const NEAR_Y = 6;

export interface CaretSpot {
  left: number;
  top: number;
}

/** The slot (0 = the flag's normal place) of each caret, in the given order. */
export function flagSlots(spots: readonly CaretSpot[]): number[] {
  const slots: number[] = [];
  spots.forEach((s, i) => {
    let slot = 0;
    for (let j = 0; j < i; j++) {
      const o = spots[j]!;
      if (Math.abs(o.left - s.left) <= NEAR_X && Math.abs(o.top - s.top) <= NEAR_Y) slot = Math.max(slot, slots[j]! + 1);
    }
    slots.push(slot);
  });
  return slots;
}
