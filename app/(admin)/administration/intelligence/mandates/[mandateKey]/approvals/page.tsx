// record-view: none — a redirect to the page that shows the record
// /administration/intelligence/mandates/<key>/approvals — the mandate record page on its
// Approvals tab (status, decision history, held runs, spend). The tab lives in ?tab=.
import { redirect } from "next/navigation";

export default async function MandateApprovalsRoute({
  params,
}: {
  params: Promise<{ mandateKey: string }>;
}) {
  const { mandateKey } = await params;
  redirect(`/administration/intelligence/mandates/${encodeURIComponent(mandateKey)}?tab=approvals`);
}
