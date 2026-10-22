/**
 * Sign-up welcome — the name a person typed into the door's "Your name" field, kept per welcome subject so a reload
 * greets them by it instead of asking again. Their own word, for this browser only; the run they started carries it.
 */

import { defineClientKeyFamily } from "@/lib/sync/client-storage";

const typed = defineClientKeyFamily({
  id: "welcome.typed-name",
  area: "local",
  kind: "draft",
  reason: "The name typed into the sign-up welcome's name field; a reload greets the person by it.",
});

export function readTypedName(subject: string): string | null {
  try {
    const v = typed.getJSON<string>(subject);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function writeTypedName(subject: string, name: string): void {
  try {
    typed.setJSON(subject, name);
  } catch {
    // not stored: a reload asks once more
  }
}

/** What the picked "Which one is you?" card showed (its place and company), kept per welcome subject: the card's
 *  source rows are later replaced by richer reads of the same accounts, so a reload could no longer redraw it. */
export interface PickedCard {
  place: string | null;
  company: string | null;
}

const picked = defineClientKeyFamily({
  id: "welcome.picked-card",
  area: "local",
  kind: "draft",
  reason: "The place and company the sign-up welcome card a person picked showed; a reload keeps them as their answer.",
});

export function readPickedCard(subject: string): PickedCard | null {
  try {
    const v = picked.getJSON<PickedCard>(subject);
    return v && typeof v === "object" ? { place: v.place ?? null, company: v.company ?? null } : null;
  } catch {
    return null;
  }
}

export function writePickedCard(subject: string, card: PickedCard): void {
  try {
    picked.setJSON(subject, card);
  } catch {
    // not stored: a reload redraws it from the accounts (welcomeVerdict pickedCardFacts)
  }
}
