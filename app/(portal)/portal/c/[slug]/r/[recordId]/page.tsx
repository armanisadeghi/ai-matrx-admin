// record-view: none — a public portal record view addressed by link, not the signed-in record page
// app/(portal)/portal/c/[slug]/r/[recordId]/page.tsx — ONE OF HER RECORDS.
//
// The fields the portal allows, with their real labels; the ones it opened for
// editing, editable in place; and, where it allows them, the conversation.
//
// 🚨 WHICH FIELDS APPEAR IS THE PORTAL'S LIST, NEVER THE DOCUMENT'S KEYS. The
// door does not delete a masked field — it returns it as a NULL key beside a
// `_hidden` block naming it and saying why — so a screen that looped over the
// document would print `internal_margin` to a customer. `features/portals/shown.ts`
// takes the portal's own `visible_fields` and nothing else. See its header.
//
// WHICH TABLE THIS RECORD IS IN is answered by asking the doors, not by guessing
// from the shape of the document: each Table the portal opens is read and the
// record is located in one of them. A record that is in none of them is not hers
// to see, and the page says exactly that.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PublicLinkNotice } from "@/components/public-link/PublicLinkNotice";
import { PortalCommentThread, type ThreadComment } from "@/features/portals/PortalCommentThread";
import { PortalFieldEditor } from "@/features/portals/PortalFieldEditor";
import { PortalAccentBand, PortalFooter, PortalLogo } from "@/features/portals/PortalBrand";
import { PortalStatusTimeline } from "@/features/portals/PortalStatusTimeline";
import { portalLook, type PortalLook } from "@/features/portals/look";
import { buildTimeline, stageLabel } from "@/features/portals/timeline";
import { PortalSignOutButton } from "@/features/portals/PortalSignOutButton";
import {
  membershipFor,
  portalComments,
  portalMe,
  portalPublic,
  portalRecord,
  portalRecordHistory,
  portalRecordVersion,
  portalRecords,
  portalViewer,
  type PortalMembership,
  type PortalTable,
} from "@/features/portals/service";
import { detailFieldKeys } from "@/features/portals/blocks";
import { isHers, readable, shownFields } from "@/features/portals/shown";

import { addPortalComment, payPortalRecord, savePortalField } from "./actions";
import { PortalSurfaceRuntime, type PortalRecordWrites } from "@/features/portals/PortalSurfaceRuntime";
import { CLIENT_PORTAL_RECORD_SURFACE_NAME } from "@/features/surfaces/manifests/client-portal.manifest";
import { readAsk, recordPaymentStatus } from "@/features/payments/server";
import { PortalPayButton } from "@/features/portals/PortalPayButton";
import { resolveAmountCents } from "@/features/payments/amount";
import { formatMoney } from "@ai-matrx/kit/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your record",
  robots: { index: false, follow: false },
};

export default async function PortalRecordPage({
  params,
}: {
  params: Promise<{ slug: string; recordId: string }>;
}) {
  const { slug, recordId } = await params;

  const portal = await portalPublic(slug);
  if (!portal) notFound();
  // Surface `matrx-public/client-portal-record`: what each screen below shows.
  const surface = (values: Record<string, unknown>, node: React.ReactNode, writes?: PortalRecordWrites) => (
    <PortalSurfaceRuntime
      surfaceName={CLIENT_PORTAL_RECORD_SURFACE_NAME}
      values={{ portal_slug: portal.slug, portal_title: portal.title, business_name: portal.organization, record_id: recordId, ...values }}
      writes={writes}
    >
      {node}
    </PortalSurfaceRuntime>
  );
  // THE STORE IS SWITCHED OFF: the same whole-screen sentence the portal's front page shows, asked
  // FIRST — every door below would refuse and this page used to fall to the error screen
  // (measured live 2026-09-25, lane S6's store-off probe).
  if (portal.state === "unavailable") {
    return surface(
      { portal_access: "unavailable", record_state: "sign_in" },
      <PublicLinkNotice title={portal.title} message={portal.message} />,
    );
  }

  const viewer = await portalViewer();
  const membership = viewer ? membershipFor(await portalMe(), portal.slug) : null;
  const look = portalLook(membership?.style ?? portal.style, portal.organization);

  // Signed out, or signed in as somebody who is not on this portal: the portal's
  // own front page says the right sentence for both, so send them there rather
  // than writing a second, quieter version of it here.
  if (!membership) {
    return surface(
      { portal_access: viewer ? "not_on_portal" : "signed_out", business_name: look.name, record_state: "sign_in" },
      <Frame look={look}>
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-sm shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{portal.title}</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to see this. {portal.organization} invites each client by email address.
          </p>
          <Link
            href={`/portal/c/${encodeURIComponent(portal.slug)}`}
            className="mt-4 inline-block font-medium text-primary underline underline-offset-4"
          >
            Go to the sign-in page
          </Link>
        </section>
      </Frame>,
    );
  }

  const located = await locate(membership, recordId);
  const herValues = {
    portal_access: "client",
    portal_title: membership.title,
    business_name: look.name,
    client_name: membership.client,
  };
  if (!located) {
    return surface(
      { ...herValues, record_state: "not_hers" },
      <Frame look={look}>
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-sm shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            That is not on your portal
          </h1>
          <p className="mt-2 text-muted-foreground">
            This link points at something {membership.organization} has not shared with{" "}
            {membership.client}.
          </p>
          <Link
            href={`/portal/c/${encodeURIComponent(membership.slug)}`}
            className="mt-4 inline-block font-medium text-primary underline underline-offset-4"
          >
            Back to your portal
          </Link>
        </section>
      </Frame>,
    );
  }

  const { table } = located;
  const [document, fields, history, version] = await Promise.all([
    portalRecord({ organizationId: membership.organization_id, recordId }),
    shownFields(membership.organization_id, table),
    // S6: the status line reads the EXISTING history door as her, which masks every field the
    // portal did not open. A table with no stage shown asks nothing.
    table.stage
      ? portalRecordHistory({ organizationId: membership.organization_id, recordId }).catch(() => null)
      : Promise.resolve([]),
    // THE VERSION SHE SEES, read with the record: every save is sent against it (lane 10 VWF).
    portalRecordVersion({ organizationId: membership.organization_id, recordId }),
  ]);
  if (!document) notFound();
  const stageKey = table.stage?.field ?? null;
  const timeline = table.stage ? buildTimeline(table.stage, document[table.stage.field], history ?? []) : null;

  const comments: ThreadComment[] = table.comments
    ? (
        await portalComments({
          organizationId: membership.organization_id,
          recordId,
        })
      ).map((comment) => ({
        id: comment.id,
        body: comment.body,
        author:
          comment.created_by && comment.created_by === viewer?.id
            ? "You"
            : membership.organization,
        when: WHEN.format(new Date(comment.created_at)),
        mine: Boolean(comment.created_by && comment.created_by === viewer?.id),
      }))
    : [];

  // PAYMENTS-CONNECT: a table that asks for payment offers Pay until the record is paid.
  // The amount shown is the ask's; the server recomputes it from the stored record at checkout.
  const payAsk = await readAsk("table", table.table_id).catch(() => null);
  const payStatus = payAsk ? await recordPaymentStatus(membership.organization_id, recordId).catch(() => null) : null;
  const payAmount = payAsk ? resolveAmountCents(payAsk, document) : null;
  const payLabel =
    payAsk && payAmount?.ok
      ? `Pay ${formatMoney(payAmount.cents, { currency: payAsk.currency, unit: "minor" })}`
      : "Pay";

  // A relation Field holds another record's id — not something a person reads.
  // PORTAL-BLOCKS: the owner may choose which of the shown Fields this record's page carries
  // (kept to what the portal shows — a block never widens it). Editable ones stay editable.
  const chosen = detailFieldKeys(membership.blocks, table.table_id, fields.map((f) => f.key));
  const pick = chosen ? new Set(chosen) : null;
  const worded = fields.filter((field) => field.type !== "relation" && (!pick || pick.has(field.key)));
  const headline = worded[0] ? readable(document[worded[0].key]) : "";
  const readOnly = worded.filter((field) => !field.editable);
  const editable = fields.filter((field) => field.editable && (!pick || pick.has(field.key)));

  const shownKeys = new Set([...worded, ...editable].map((field) => field.key));
  return surface(
    {
      ...herValues,
      record_state: "shown",
      record_headline: headline || table.name,
      table_name: table.name,
      record_stage: stageKey ? stageLabel(table.stage, document[stageKey]) || null : null,
      record_fields: fields
        .filter((field) => shownKeys.has(field.key))
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: field.key === stageKey ? stageLabel(table.stage, document[field.key]) : readable(document[field.key]),
          editable: field.editable,
        })),
      payment: payAsk
        ? {
            description: payAsk.description || "Payment",
            amount: payAmount?.ok ? payLabel.replace(/^Pay /, "") : null,
            status: payStatus ?? "unpaid",
          }
        : null,
      messages_enabled: table.comments,
      messages: comments.map((comment) => ({ author: comment.author, body: comment.body, when: comment.when })),
    },
    <Frame align="start" look={look}>
      <div className="w-full max-w-2xl">
        <header className="flex items-start justify-between gap-3 pt-1">
          <div className="min-w-0">
            <Link
              href={`/portal/c/${encodeURIComponent(membership.slug)}`}
              data-tap-target
              className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {membership.client}
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <PortalLogo look={look} size="sm" />
              <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-foreground">
                {headline || table.name}
              </h1>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {table.name} · {look.name}
            </p>
          </div>
          <PortalSignOutButton slug={membership.slug} />
        </header>

        {timeline ? (
          <PortalStatusTimeline timeline={timeline} look={look} unavailable={history === null} />
        ) : null}

        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <dl className="divide-y divide-border">
            {readOnly.map((field) => {
              const raw = document[field.key];
              const value = field.key === stageKey ? stageLabel(table.stage, raw) : readable(raw);
              return (
                <div
                  key={field.key}
                  className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-40 sm:shrink-0">
                    {field.label}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {value || <span className="text-muted-foreground">Not set yet</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        {editable.length > 0 ? (
          <section className="mt-6 space-y-5 rounded-xl border border-border bg-card p-4">
            {editable.map((field) => (
              <PortalFieldEditor
                key={field.key}
                slug={membership.slug}
                recordId={recordId}
                fieldKey={field.key}
                label={field.label}
                initialValue={readable(document[field.key])}
                initialVersion={version}
                save={savePortalField}
              />
            ))}
          </section>
        ) : null}

        {payAsk ? (
          <section className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-sm text-foreground">{payAsk.description || "Payment"}</div>
            {payStatus === "paid" || payStatus === "refunded" ? (
              <span className="text-sm font-medium text-muted-foreground">{payStatus === "paid" ? "Paid" : "Refunded"}</span>
            ) : (
              <PortalPayButton
                label={payStatus === "expired" || payStatus === "failed" || payStatus === "pending" ? payLabel.replace(/^Pay/, "Pay again") : payLabel}
                action={payPortalRecord.bind(null, membership.slug, recordId)}
              />
            )}
          </section>
        ) : null}

        {table.comments ? (
          <section className="mt-6 pb-12">
            <h2 className="px-1 text-sm font-semibold tracking-tight text-foreground">Messages</h2>
            <div className="mt-2">
              <PortalCommentThread
                slug={membership.slug}
                recordId={recordId}
                comments={comments}
                send={addPortalComment}
              />
            </div>
          </section>
        ) : (
          <div className="pb-12" />
        )}
        <PortalFooter look={look} />
      </div>
    </Frame>,
    {
      slug: membership.slug,
      recordId,
      editableKeys: editable.map((field) => field.key),
      version,
      comments: table.comments,
      saveField: savePortalField,
      addComment: addPortalComment,
    },
  );
}

/** The same frame the portal's front page uses, for the same reasons. */
function Frame({
  children,
  align = "center",
  look,
}: {
  children: React.ReactNode;
  align?: "center" | "start";
  look: PortalLook;
}) {
  return (
    <main
      className={`matrx-touch-targets flex min-h-dvh w-full flex-col items-center bg-textured px-4 pb-safe sm:px-6 ${
        align === "center" ? "justify-center py-10" : "justify-start py-6"
      }`}
    >
      <PortalAccentBand look={look} />
      {children}
    </main>
  );
}

/** Which of the portal's Tables holds this record — asked, never inferred. */
async function locate(
  membership: PortalMembership,
  recordId: string,
): Promise<{ table: PortalTable } | null> {
  for (const table of membership.tables) {
    const records = await portalRecords({
      organizationId: membership.organization_id,
      tableId: table.table_id,
    });
    if (
      records.some(
        (record) =>
          record.id === recordId && isHers(record.document, table.names_via, membership.client_record_id),
      )
    )
      return { table };
  }
  return null;
}

/**
 * One date format, resolved on the server and sent as a string, so the server's
 * HTML and the client's never disagree about a locale or a time zone — a
 * hydration mismatch is a layout shift with extra steps.
 */
const WHEN = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
