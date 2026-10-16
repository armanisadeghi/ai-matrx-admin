// Sign-up welcome — "Which one is you?" (features/marketing/smart-add/welcome/PersonPickCards.tsx) on REAL anchor-round
// evidence (fixtures: Nicole Long, six people; Rochelle Moulton, one). Signed in, stored profile photos come through
// their doors; signed out, the provider photo or the initial stands in.
import { LabSmartAddProviders } from "../smart-add-brand/LabSmartAddProviders";
import { createClient } from "@/utils/supabase/server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { mapUserData } from "@/utils/userDataMapper";
import { getAdminStatus } from "@/utils/supabase/userSessionData";
import { LabWelcomePeople } from "./LabWelcomePeople";

export const metadata = { title: "Welcome — which one is you" };

export default async function LabWelcomePeoplePage() {
  const { user } = await getServerAuth();
  if (!user) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Sign in first, then reload. <a className="text-primary" href="/login?redirectTo=/lab/welcome-people">Sign in</a>
      </main>
    );
  }
  const supabase = await createClient();
  const [{ data: { session } }, admin] = await Promise.all([
    supabase.auth.getSession(),
    getAdminStatus(supabase, user.id).catch(() => ({ isAdmin: false, level: null })),
  ]);
  const userData = mapUserData(user, session?.access_token, admin.isAdmin, admin.level);
  return (
    <LabSmartAddProviders initialReduxState={{ user: userData }}>
      <LabWelcomePeople />
    </LabSmartAddProviders>
  );
}
