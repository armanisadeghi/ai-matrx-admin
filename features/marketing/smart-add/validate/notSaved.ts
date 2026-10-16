/**
 * A validation answer the database refused (MKT-151). Never silent: the failure is filed (the Error Inspector and
 * ops.system_error, with the brand, the card and the answer) and the person is told, in plain words, that this one
 * answer was not saved and why. The tray row keeps "Not saved" with Undo, so the card can be answered again.
 */

import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { toastErrorAlreadyCaptured } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import type { Answer, FocusItem } from "./queue";

export function reportAnswerNotSaved(input: { brandId: string; item: FocusItem; answer: Answer; value: string; error: unknown }): string {
  const message = extractErrorMessage(input.error);
  const status = (input.error as { status?: unknown } | null)?.status;
  captureError({
    source: "unsaved-work",
    operation: "update",
    schema: "web",
    relation: "discovered_item",
    message,
    status: typeof status === "number" ? status : undefined,
    userMessage: `"${input.value}" was not saved.`,
    callSite: "smart_add.validate.persistAnswer",
    raw: { brand_id: input.brandId, card_key: input.item.key, card_kind: input.item.kind, answer: input.answer },
  });
  toastErrorAlreadyCaptured(`Not saved: ${input.value}`, { description: message });
  return message;
}
