import "server-only";

// features/booking/service.ts — THE PUBLIC BOOKING PAGE'S ONLY DATA ACCESS.
//
// PRODUCTS row 14: *"Let clients book a 30-minute consult."* Six doors, all
// server-lane, and nothing else anywhere in the repo touches them.
//
// WHY THE SERVER IS THE CALLER. `custom.booking_public`, `booking_hold`,
// `booking_confirm`, `booking_manage`, `booking_reschedule` and `booking_cancel`
// are declared `server_only` in `platform.client_callable_door`, beside
// `custom.form_public` and `custom.form_submit`, for the same reason: the ORIGIN
// of a request and the address of the client are things the server knows and a
// browser can only assert. A browser choosing its own rate-limit bucket would be
// counting itself — and for booking the bucket is more than a budget, it is WHO
// IS HOLDING THE SLOT, so a browser choosing it would be a browser able to
// confirm somebody else's hold.
//
// WHAT THE PUBLIC READ CAN AND CANNOT SEE. `custom.booking_public` answers the
// page's own words, the Field definitions of exactly the questions a person
// answers, and every slot it offers with whether it is taken RIGHT NOW. It reads
// no booking and it never says WHO holds a slot. A page that does not exist, one
// that was never published, one that is a plain form rather than a booking page,
// and one in an organization whose store is switched off all answer with ZERO
// ROWS — that is the 404, and it is the same silence `custom.form_public` keeps.
//
// THE SLOTS ARE THE STORE'S, NEVER THIS FILE'S. The grid is computed by
// `custom._booking_slots` from the organization's availability, in the
// organization's timezone, past its lead time, inside its daily cap — and
// `custom.booking_hold` checks the asked-for slot against that SAME function
// before it holds anything. A picker that built its own grid would let a visitor
// with a wrong clock, or a visitor with a console, ask for a time that was never
// offered.

import { cache } from "react";

import { storeDoors as storeDoorsOf } from "@ai-matrx/records/core";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { busyFromIcs } from "./ics-busy";

/**
 * Schema `custom` is deliberately not in `types/database.types.ts`: the record
 * store is reached through its doors, never as tables a screen selects from.
 * `features/forms/service.ts` names this cast once for the two form doors; this
 * is the same cast for the six booking ones, and the result shapes below are
 * declared in full so a door that changes its answer shows up as a type error
 * here rather than as a wrong screen.
 */
function storeDoors() {
  // The service-role client, bound to the store's doors by the package: a booker has no session.
  return storeDoorsOf(createAdminClient());
}

/** One question, in the page's own words, pointing at one Field by key. */
export interface BookingQuestion {
  field: string;
  ask?: string | null;
  help?: string | null;
  required?: boolean | null;
  /** `slot`, `status` and `booked_with` — the store fills these in from the hold. */
  hidden?: boolean | null;
}

/** One time on offer. `taken` is the store's answer at the moment it was asked. */
export interface BookingSlot {
  key: string;
  at: string;
  taken: boolean;
  /** Only on the manage page: the appointment this person already has. */
  mine?: boolean;
  member_user_id: string | null;
  /** CD-PAGE-10: places at this time (hosts x capacity) and how many are still free. Absent on pages made before places. */
  seats?: number;
  left?: number;
}

/** The hours an organization offers, as `custom._booking_availability` normalized them. */
export interface BookingAvailability {
  timezone: string;
  slot_minutes: number;
  buffer_minutes: number;
  lead_minutes: number;
  max_per_day: number;
  days: number;
  windows: Array<{ weekday: number; from: string; to: string; member_user_id: string | null }>;
}

/** What `custom.booking_public` answers, exactly. */
export interface PublicBooking {
  form_id: string;
  organization_id: string;
  table_id: string;
  title: string;
  presentation: {
    intro?: string | null;
    thank_you?: { title: string; body?: string | null } | null;
    submit_label?: string | null;
    questions?: BookingQuestion[];
    /** The owner's switches. Only `sms.on` matters to the public page: it offers "Text me reminders". */
    booking_messages?: { sms?: { on?: boolean } } | null;
  };
  fields: Array<Record<string, unknown>>;
  honeypot_key: string | null;
  availability: BookingAvailability;
  slots: BookingSlot[];
  /** `unavailable` is STORE-OFF's — published, but the organization's store is switched off. */
  state: "open" | "closed" | "full" | "unavailable";
  message: string | null;
}

const REF = /^[0-9a-f]{32}$/i;

/**
 * The booking page behind a public link, or `null` — the 404, and the same
 * answer for missing, unpublished, not-a-booking-page and store-switched-off.
 *
 * `cache()` dedupes it within one request because `generateMetadata` and the
 * page both want it.
 */
export const publicBooking = cache(
  async (formId: string, days?: number): Promise<PublicBooking | null> => {
    if (!isUuidShape(formId)) return null;
    const { data, error } = await storeDoors().rpc("booking_public", {
      p_form_id: formId,
      p_days: days ?? null,
    });
    if (error) {
      // NOTHING FAILS SILENTLY. A door that refused is not an absent page: a 404
      // here would tell the person their link is wrong when it is ours that is.
      throw new Error(`custom.booking_public refused: ${error.message}`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    return (row as PublicBooking | undefined) ?? null;
  },
);

/**
 * CD-PAGE-10 — A CONNECTED CALENDAR'S BUSY TIMES. A booking page may carry its owner's private iCal address
 * (Google, Outlook or Apple Calendar each give one). The store keeps that address and the busy moments read from it
 * (`custom.booking_busy_due` / `custom.booking_busy_set`, server lane only — the address is the owner's secret and
 * never reaches a browser) and never offers a busy time. This re-reads the calendar when the store says it is due
 * (knob booking/busy_refresh_minutes). A calendar that cannot be read keeps the last good list and the reason goes on
 * the page's builder; nothing here throws into the visitor's page.
 */
// A bound on one read of the owner's calendar, not a tunable: past it the read counts as failed and is said.
const CALENDAR_READ_WAIT_MS = 4000;

export async function refreshBusyIfDue(formId: string): Promise<{ read: boolean; busy?: number; problem?: string | null }> {
  if (!isUuidShape(formId)) return { read: false };
  const doors = storeDoors();
  const due = await doors.rpc("booking_busy_due", { p_form_id: formId });
  if (due.error) {
    console.error(`[booking] custom.booking_busy_due refused for ${formId}: ${due.error.message}`);
    return { read: false, problem: due.error.message };
  }
  const row = (Array.isArray(due.data) ? due.data[0] : due.data) as
    | { feed: string | null; due: boolean; timezone: string | null; days: number | null }
    | undefined;
  if (!row?.feed || !row.due) return { read: false };
  let busy: Array<{ from: string; to: string }> = [];
  let problem: string | null = null;
  try {
    const res = await fetch(row.feed.trim().replace(/^webcals?:\/\//i, "https://"), {
      signal: AbortSignal.timeout(CALENDAR_READ_WAIT_MS),
      headers: { accept: "text/calendar, text/plain;q=0.8, */*;q=0.5" },
      cache: "no-store",
    });
    if (!res.ok) problem = `The connected calendar answered ${res.status} — check its private address.`;
    else {
      const text = await res.text();
      if (!/BEGIN:VCALENDAR/i.test(text)) problem = "The connected calendar's address does not give a calendar file.";
      else {
        const from = new Date();
        const to = new Date(from.getTime() + ((row.days ?? 14) + 1) * 86_400_000);
        busy = busyFromIcs(text, { from, to }, row.timezone ?? "UTC").busy;
      }
    }
  } catch (err) {
    problem =
      err instanceof Error && err.name === "TimeoutError"
        ? "The connected calendar took too long to answer."
        : `The connected calendar could not be read (${err instanceof Error ? err.message : String(err)}).`;
  }
  const set = await doors.rpc("booking_busy_set", { p_form_id: formId, p_busy: busy, p_problem: problem });
  if (set.error) {
    console.error(`[booking] custom.booking_busy_set refused for ${formId}: ${set.error.message}`);
    return { read: true, problem: set.error.message };
  }
  return { read: true, busy: busy.length, problem };
}

/** What a hold answers. `state` is the store's own word, never derived here. */
export interface HoldOutcome {
  hold_id: string | null;
  slot_key: string;
  expires_at: string | null;
  member_user_id: string | null;
  state: "held" | "taken" | "not_offered" | "closed" | "too_many";
  message: string | null;
}

/**
 * Hold one slot, BEFORE the details are taken. This is the whole product: two
 * people asking for the same time get one booking and one plain refusal, decided
 * by a unique index in the database rather than by a check this process makes.
 */
export async function holdSlot(args: {
  formId: string;
  slotKey: string;
  origin: string;
  bucket: string;
  clientKey: string | null;
}): Promise<HoldOutcome> {
  const { data, error } = await storeDoors().rpc("booking_hold", {
    p_form_id: args.formId,
    p_slot_key: args.slotKey,
    p_origin: args.origin,
    p_bucket: args.bucket,
    p_client_key: args.clientKey,
  });
  if (error) throw carried(error);
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as HoldOutcome | undefined) ?? {
      hold_id: null,
      slot_key: args.slotKey,
      expires_at: null,
      member_user_id: null,
      state: "not_offered",
      message: "That time could not be held and the store did not say why, so nothing was booked.",
    }
  );
}

/** What a confirm answers. */
export interface ConfirmOutcome {
  booking_ref: string | null;
  record_id: string | null;
  submission_id: string | null;
  slot_key: string | null;
  slot_at: string | null;
  state: "booked" | "held" | "closed" | "full" | "too_many" | "hold_lost" | "hold_expired";
  message: string | null;
}

/**
 * The details, once a slot is held. The ORIGIN and the BUCKET come from the
 * request the server is holding — never from the body — and the bucket must be
 * the SAME one the hold was taken with, because it is what makes the hold this
 * visitor's rather than anybody's.
 */
export async function confirmBooking(args: {
  formId: string;
  holdId: string;
  origin: string;
  bucket: string;
  values: Record<string, unknown>;
  honeypot: string | null;
  clientKey: string | null;
}): Promise<ConfirmOutcome> {
  const { data, error } = await storeDoors().rpc("booking_confirm", {
    p_form_id: args.formId,
    p_hold_id: args.holdId,
    p_origin: args.origin,
    p_payload: args.values,
    p_bucket: args.bucket,
    p_honeypot: args.honeypot,
    p_client_key: args.clientKey,
  });
  if (error) throw carried(error);
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as ConfirmOutcome | undefined) ?? {
      booking_ref: null,
      record_id: null,
      submission_id: null,
      slot_key: null,
      slot_at: null,
      state: "held",
      message: null,
    }
  );
}

/** What `custom.booking_sms_consent` answers. */
export interface SmsConsentOutcome {
  recorded: boolean;
  queued?: number;
  why?: string;
  say?: string;
}

/**
 * RECORD A BOOKER'S CONSENT TO TEXT REMINDERS, right after the booking is confirmed. The booking ref is
 * the booker's own unguessable capability; the store records the number, the exact words shown and
 * the time on the booking, and only then queues any text. The words are what the page actually showed.
 */
export async function recordSmsConsent(args: {
  ref: string;
  phone: string;
  textShown: string;
  origin: string;
}): Promise<SmsConsentOutcome> {
  const { data, error } = await storeDoors().rpc("booking_sms_consent", {
    p_booking_ref: args.ref,
    p_phone: args.phone,
    p_text_shown: args.textShown,
    p_origin: args.origin,
  });
  if (error) throw carried(error);
  return (Array.isArray(data) ? data[0] : data) as SmsConsentOutcome;
}

/** What `custom.booking_manage` answers about one person's own appointment. */
export interface ManagedBooking {
  booking_ref: string;
  form_id: string;
  title: string;
  slot_key: string | null;
  slot_at: string | null;
  status: string;
  slots: BookingSlot[];
  availability: BookingAvailability;
  /** `unavailable` is STORE-OFF's — a real appointment whose organization switched the store off. */
  state: "booked" | "cancelled" | "held" | "unavailable";
  message: string | null;
}

/**
 * One booking, by the unguessable link its own visitor was given — 128 bits,
 * minted at confirm, and NOT the record id. A person must be able to move their
 * own appointment without an account and without being able to name anybody
 * else's.
 */
export const managedBooking = cache(
  async (ref: string, days?: number): Promise<ManagedBooking | null> => {
    if (!REF.test(ref)) return null;
    const { data, error } = await storeDoors().rpc("booking_manage", {
      p_booking_ref: ref,
      p_days: days ?? null,
    });
    if (error) throw new Error(`custom.booking_manage refused: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    return (row as ManagedBooking | undefined) ?? null;
  },
);

export interface MoveOutcome {
  booking_ref: string;
  record_id: string | null;
  slot_key: string | null;
  slot_at: string | null;
  state: "moved" | "taken" | "not_offered" | "unchanged" | "cancelled" | "held";
  message: string | null;
}

/** Move one appointment. The record and the calendar hold move together, or neither does. */
export async function rescheduleBooking(args: {
  ref: string;
  slotKey: string;
  origin: string;
  bucket: string;
}): Promise<MoveOutcome> {
  const { data, error } = await storeDoors().rpc("booking_reschedule", {
    p_booking_ref: args.ref,
    p_slot_key: args.slotKey,
    p_origin: args.origin,
    p_bucket: args.bucket,
  });
  if (error) throw carried(error);
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as MoveOutcome | undefined) ?? {
      booking_ref: args.ref,
      record_id: null,
      slot_key: null,
      slot_at: null,
      state: "not_offered",
      message: "Your appointment was not moved and the store did not say why.",
    }
  );
}

export interface CancelOutcome {
  booking_ref: string;
  record_id: string | null;
  slot_key: string | null;
  state: "cancelled" | "held";
  message: string | null;
}

/** Cancel one appointment. The booking is kept and MARKED; the slot goes back on offer. */
export async function cancelBooking(args: {
  ref: string;
  origin: string;
}): Promise<CancelOutcome> {
  const { data, error } = await storeDoors().rpc("booking_cancel", {
    p_booking_ref: args.ref,
    p_origin: args.origin,
  });
  if (error) throw carried(error);
  const row = Array.isArray(data) ? data[0] : data;
  return (
    (row as CancelOutcome | undefined) ?? {
      booking_ref: args.ref,
      record_id: null,
      slot_key: null,
      state: "held",
      message: "Nothing was canceled and the store did not say why.",
    }
  );
}

/**
 * THE STORE'S OWN SENTENCE, CARRIED WHOLE. These doors name the field they do
 * not have, the answers that are missing and the reason a hold was refused, so
 * the screen can point at the thing to fix instead of showing one generic error.
 */
function carried(error: { message: string; hint?: string | null }): Error & { hint?: string } {
  const err = new Error(error.message) as Error & { hint?: string };
  if (error.hint) err.hint = error.hint;
  return err;
}

/**
 * The coarse client identifier the store uses for BOTH the rate limit and the
 * identity of whoever is holding a slot. One definition, because a hold taken
 * under one bucket and confirmed under another is a person refused their own
 * appointment — which is exactly the defect this lane measured and fixed in the
 * store on 2026-09-20.
 */
export function bucketFor(request: Request): { origin: string; bucket: string } {
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { origin, bucket: forwarded && forwarded.length > 0 ? forwarded : origin };
}
