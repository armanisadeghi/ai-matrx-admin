// record-view: none — a public booking page addressed by a booking reference
// app/(link)/b/[bookingId]/page.tsx — THE PUBLIC BOOKING PAGE. PRODUCTS row 14.
//
// A person with no account opens an unguessable link, picks a day, picks a time
// in their own timezone, gives their name and their email, and has an
// appointment. It becomes an ordinary record in a real Table, stamped with the
// page it came through, and whoever owns the page is told.
//
// IT IS IN `(link)` AND NOT `(public)`, for the reason that group's layout
// gives: `(public)` is the MARKETING SITE, and a clinic's booking page wearing
// our Download / Sign in header invites a stranger to download our product
// instead of booking the appointment their doctor asked them to book.
//
// SERVER-RENDERED. The questions, the Field definitions, the hours and WHICH
// TIMES ARE FREE are resolved here, on the server, through
// `custom.booking_public` — so the first paint is the real picker at its real
// size, and the browser never holds a key to the record store.
//
// THE TIMES ARE THE STORE'S. The grid comes from the organization's
// availability, in the organization's timezone, past its lead time, inside its
// daily cap, and `custom.booking_hold` checks any asked-for time against the
// SAME function. The browser renders those instants in the VISITOR's timezone —
// which is a display concern and nothing else.
//
// 404 IS THE ANSWER TO FOUR DIFFERENT QUESTIONS, on purpose: a page that never
// existed, one never published, and one that is a plain form rather than a
// booking page all resolve to nothing. Telling them apart would let a link be
// used to learn something is there. A page in an organization whose store is
// switched OFF used to be a fourth, and STORE-OFF (2026-09-22) took it out of
// that set: the person holding this link was sent it by the business whose
// calendar it is, so the door names the switch instead of disappearing.

import { RichContentServer } from "@ai-matrx/rich-content/levels/server/RichContentServer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { PublicLinkNotice } from "@/components/public-link/PublicLinkNotice";
import { publicBooking, refreshBusyIfDue } from "@/features/booking/service";

import { BookingPicker } from "@/features/booking/BookingPicker";
import { PaymentNotice } from "@/features/payments/PaymentNotice";
import { paymentNoticeFor } from "@/features/payments/notice";

// What is free moves minute by minute, and nothing here is cacheable across people.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}): Promise<Metadata> {
  const { bookingId } = await params;
  const page = await publicBooking(bookingId).catch(() => null);
  if (!page) {
    return { title: "Book a time · AI Matrx", robots: { index: false, follow: false } };
  }
  const intro = page.presentation?.intro ?? undefined;
  return {
    title: `${page.title} · AI Matrx`,
    ...(intro ? { description: intro } : {}),
    // A booking link is meant to be sent to the people who should use it, not
    // found by strangers searching. The owner shares it; we do not index it.
    robots: { index: false, follow: false },
    openGraph: { title: page.title, ...(intro ? { description: intro } : {}), type: "website" },
  };
}

// PAYMENTS-CONNECT: /api/payments/return sends the booker back here with ?payment=…&pid=<payment>.
// What the page says is read from that payment on the server (features/payments/notice.ts,
// REVIEW-PAYMENTS I4) — a hand-typed ?payment=paid shows nothing.

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bookingId } = await params;
  const query = await searchParams;
  const page = await publicBooking(bookingId);
  if (!page) notFound();
  // CD-PAGE-10: a connected calendar is re-read after the page is sent (never holding the visitor's page up); the
  // hold re-reads before it holds, so a time the owner just became busy at is never booked.
  after(() => refreshBusyIfDue(bookingId).then(() => undefined));
  const payment = await paymentNoticeFor(bookingId, query, `/b/${bookingId}`);

  // PAID IS THE END OF THE VISIT: say it is confirmed, not a fresh picker that reads as "book again".
  if (payment?.outcome === "paid") {
    return (
      <PublicLinkNotice title={page.title} message="Payment received. Your booking is confirmed.">
        <a href={`/b/${bookingId}`} className="text-sm text-muted-foreground underline underline-offset-4">
          Book another time
        </a>
      </PublicLinkNotice>
    );
  }

  // CLOSED, FULL AND SWITCHED OFF ARE NOT ERRORS, and they are not 404s either:
  // the link is real and the person following it deserves a sentence rather than
  // a dead end. The words are the STORE's, so the page and the door can never
  // disagree. `unavailable` is STORE-OFF's (2026-09-22): a booking page whose
  // organization has switched the record store off used to 404 at the customer
  // who was sent it.
  if (page.state !== "open") {
    return <PublicLinkNotice title={page.title} message={page.message} />;
  }

  return (
    // NOTHING ON THIS PAGE BUT THE BOOKING. Centered the way Calendly and Cal.com
    // center theirs, with the page's own name said once, here.
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 pb-safe pt-8 matrx-touch-targets">
      <h1 className="text-xl font-medium">{page.title}</h1>
      {payment ? (
        <div className="mt-3">
          <PaymentNotice {...payment} note="Your time is booked but unpaid." />
        </div>
      ) : null}
      {page.presentation?.intro ? (
        <p className="mt-1 text-sm text-muted-foreground">
          <RichContentServer level="inline" source={page.presentation.intro} />
        </p>
      ) : null}
      <BookingPicker page={page} />
    </main>
  );
}
