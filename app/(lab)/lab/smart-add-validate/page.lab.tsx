// Smart Add validation — the story page: the REAL stage (features/marketing/smart-add/validate)
// on fixture data (one real fullspecstaff.com round + facts/suggestion fixtures). Answers are kept
// in this page only; nothing is saved. The live page is /marketing/brands/smart-add after Create.
import { createClient } from "@/utils/supabase/server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { mapUserData } from "@/utils/userDataMapper";
import { LabSmartAddProviders } from "../smart-add-brand/LabSmartAddProviders";
import { LabValidateStory } from "./LabValidateStory";

export const metadata = { title: "Smart Add — validation story" };

export default async function LabSmartAddValidatePage() {
  const { user } = await getServerAuth();
  if (!user) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Sign in first, then reload. <a className="text-primary" href="/login?redirectTo=/lab/smart-add-validate">Sign in</a>
      </main>
    );
  }
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return (
    <LabSmartAddProviders initialReduxState={{ user: mapUserData(user, session?.access_token, false, null) }}>
      <LabValidateStory />
    </LabSmartAddProviders>
  );
}
