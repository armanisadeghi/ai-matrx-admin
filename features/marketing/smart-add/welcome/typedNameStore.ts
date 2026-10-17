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
