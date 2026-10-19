// record-view: none — billing_held_run takes no custom fields (no registry type)
// HeldRunView — one run a spend gate stopped (billing.held_run), with Replay and watch.
// `id` is the held run, or an alarm whose newest held run opens (the attention dock's door).
import { HeldRunView } from "@/features/admin/held-runs/HeldRunView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HeldRunPage({ params }: Props) {
  const { id } = await params;
  return <HeldRunView id={id} />;
}
