/**
 * MKT-151: a refused validation answer was only a "Not saved" label; nothing was filed (no ops.system_error) and the
 * person was never told why. A refused save is now filed through the Error Inspector (durable → system_error) with
 * the brand, card and answer, and told to the person with the reason.
 */
const captureError = jest.fn((_: unknown) => "e1");
const toastErrorAlreadyCaptured = jest.fn();
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: (i: unknown) => captureError(i) }));
jest.mock("@/lib/toast", () => ({ toastErrorAlreadyCaptured: (...a: unknown[]) => toastErrorAlreadyCaptured(...a) }));

import { reportAnswerNotSaved } from "../validate/notSaved";
import type { FocusItem } from "../validate/queue";

it("files the refusal and tells the person which answer was not saved and why", () => {
  const item = { key: "name:mossy beard care company", kind: "name" } as unknown as FocusItem;
  const message = reportAnswerNotSaved({
    brandId: "b1",
    item,
    answer: "preferred",
    value: "Mossy Beard Care Company",
    error: Object.assign(new Error("new row violates row-level security policy"), { status: 403 }),
  });
  expect(message).toBe("new row violates row-level security policy");
  const filed = captureError.mock.calls[0][0] as Record<string, unknown>;
  expect(filed).toMatchObject({ source: "unsaved-work", status: 403, message, raw: { brand_id: "b1", card_key: item.key, answer: "preferred" } });
  expect(filed.durable).not.toBe(false);
  expect(toastErrorAlreadyCaptured).toHaveBeenCalledWith("Not saved: Mossy Beard Care Company", { description: message });
});
