// record-view: none — a sub-view (payments) inside a record or scope, not the record page; the record's own page carries the section
// /organizations/[orgId]/settings/payments — the server reads THIS site's Stripe mode (live on
// production, test elsewhere) so the screen never says "Taking payments" for an account that
// cannot charge here; everything else is the client screen beside it.
import { requiredStripeMode } from "@/lib/stripe/server";
import { PaymentsSettings } from "./PaymentsSettings";

export default function OrgPaymentsPage() {
  return <PaymentsSettings siteMode={requiredStripeMode()} />;
}
