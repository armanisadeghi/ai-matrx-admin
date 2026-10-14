import { normalizeMediumValue } from "@/features/crm/normalize";
import { isJsonObject } from "@/types/json";
/** Same canonical target consumed by operator settings and the admitted voice callback. */
export function readVoiceTransferTarget(metadata: unknown): string | null {
  if (!isJsonObject(metadata)) return null;
  const value = metadata.voice_transfer_number;
  return typeof value === "string" && /^\+1[2-9]\d{9}$/.test(value)
    ? value
    : null;
}
export function normalizeVoiceTransferTarget(
  raw: string,
  destinationNumber: string,
): string | null {
  if (!raw.trim()) return null;
  if (!/^[+\d\s().-]+$/.test(raw)) throw Error("Enter a US phone number.");
  const target = normalizeMediumValue("phone", raw).valueKey;
  if (!/^\+1[2-9]\d{9}$/.test(target)) throw Error("Enter a US phone number.");
  if (target === destinationNumber)
    throw Error("Choose a number other than the incoming line.");
  return target;
}
