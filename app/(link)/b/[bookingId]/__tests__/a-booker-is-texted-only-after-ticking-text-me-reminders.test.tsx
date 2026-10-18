/**
 * BOOKING-NOTIFY. "Text me reminders" is offered only when the owner switched texts on, and consent is
 * the tick PLUS a number: the confirm request carries the number and the exact words shown, and carries
 * neither when the box is not ticked. (The store records the consent and queues the texts.)
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BookingPicker } = require("../../../../../features/booking/BookingPicker") as typeof import("../../../../../features/booking/BookingPicker");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const page = (smsOn: boolean) => ({
  form_id: "f1111111-1111-4111-8111-111111111111",
  organization_id: "f2222222-2222-4222-8222-222222222222",
  table_id: "f3333333-3333-4333-8333-333333333333",
  title: "Book a class",
  presentation: { questions: [{ field: "notes" }], ...(smsOn ? { booking_messages: { sms: { on: true } } } : {}) },
  fields: [{ id: "f5555555-5555-4555-8555-555555555552", key: "notes", label: "Notes", type: "text", config: {} }],
  honeypot_key: null,
  availability: { timezone: "America/Los_Angeles", slot_minutes: 45, buffer_minutes: 0, lead_minutes: 0, max_per_day: 8, days: 7, windows: [] },
  slots: [{ key: "2026-10-06T17:00:00Z", at: "2026-10-06T17:00:00Z", taken: false, member_user_id: null }],
  state: "open",
  message: null,
});

async function run(smsOn: boolean, tick: boolean): Promise<{ body: Record<string, unknown> | null; text: string }> {
  let confirmBody: Record<string, unknown> | null = null;
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/hold") && init?.method === "POST") return new Response(JSON.stringify({ state: "held", hold_id: "h1", expires_at: null }));
    if (u.endsWith("/confirm")) {
      confirmBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ state: "booked", booking_ref: "CR-1" }));
    }
    return new Response(JSON.stringify({ slots: page(false).slots }));
  }) as typeof fetch;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<BookingPicker page={page(smsOn) as never} />));
  const slot = [...host.querySelectorAll("button")].find((b) => /\d:\d\d/.test(b.textContent ?? ""))!;
  await act(async () => slot.click());
  const text = host.textContent ?? "";
  if (tick) {
    const box = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await act(async () => box.click());
    const phone = host.querySelector('input[type="tel"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(phone, "+1 949 666 2578");
      phone.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  const bookIt = [...host.querySelectorAll("button")].find((b) => /Book/.test(b.textContent ?? ""))!;
  await act(async () => bookIt.click());
  await act(async () => root.unmount());
  host.remove();
  return { body: confirmBody, text };
}

it("a page whose owner did not switch texts on never offers them", async () => {
  const r = await run(false, false);
  expect(r.text).not.toContain("Text me reminders");
  expect(r.body).not.toHaveProperty("smsConsent");
});

it("offered but not ticked: no consent travels", async () => {
  const r = await run(true, false);
  expect(r.text).toContain("Text me reminders");
  expect(r.body).not.toHaveProperty("smsConsent");
});

it("ticked with a number: the number and the exact words shown travel as the consent", async () => {
  const r = await run(true, true);
  const consent = (r.body as { smsConsent: { phone: string; textShown: string } }).smsConsent;
  expect(consent.phone).toBe("+1 949 666 2578");
  expect(consent.textShown).toMatch(/agree to get text reminders.*Reply STOP/);
});
