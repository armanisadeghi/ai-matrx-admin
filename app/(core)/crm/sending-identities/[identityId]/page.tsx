// record-view: crm_sending_identity
import { MailCheck } from "lucide-react";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { ModuleSignInGate } from "@/features/auth/components/module-landing/ModuleSignInGate";
import { SendingIdentityDetailPage } from "@/features/crm/components/sending-identities/SendingIdentityDetailPage";

/** /crm/sending-identities/[identityId] — one mailbox: its gates, limits and health. */
export default async function SendingIdentityRoute({
  params,
}: {
  params: Promise<{ identityId: string }>;
}) {
  const { identityId } = await params;
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    return (
      <ModuleSignInGate
        title="Sending Mailbox"
        route="/crm/sending-identities"
        description="Prove you own your sending domain, warm the mailbox up, and watch its delivery health."
        icon={MailCheck}
      />
    );
  }

  return (
    <>
      <SendingIdentityDetailPage identityId={identityId} />
    </>
  );
}
