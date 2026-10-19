// record-view: none — an admin support view; the admin seat never edits an organization's fields
import { MandateRecordPage } from "@/features/mandates/record-next/MandateRecordPage";

/**
 * /administration/intelligence/mandates/[mandateKey] — one mandate on the new
 * record page (tab in `?tab=`). Auth + admin gating is the `(admin)` layout's job.
 */
export const metadata = {
  title: "Mandate",
  description: "One mandate — the job, its Mandate Holder, and its overrides",
};

export default async function IntelligenceMandateRecordRoute({
  params,
}: {
  params: Promise<{ mandateKey: string }>;
}) {
  // The App Router already decodes dynamic params — never decode twice.
  const { mandateKey } = await params;
  return <MandateRecordPage mandateKeyOrId={mandateKey} />;
}
