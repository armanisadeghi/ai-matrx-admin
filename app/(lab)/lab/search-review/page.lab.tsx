// Review search results — the story page: the REAL window (features/search-review) opened from the
// REAL Smart Add entry on one recorded fullspecstaff.com round. Answers stay in this page only.
import { createClient } from "@/utils/supabase/server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { mapUserData } from "@/utils/userDataMapper";
import { LabSmartAddProviders } from "../smart-add-brand/LabSmartAddProviders";
import { LabSearchReviewStory } from "./LabSearchReviewStory";

export const metadata = { title: "Review search results — story" };

export default async function LabSearchReviewPage() {
  const { user } = await getServerAuth();
  if (!user) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Sign in first, then reload. <a className="text-primary" href="/login?redirectTo=/lab/search-review">Sign in</a>
      </main>
    );
  }
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return (
    <LabSmartAddProviders initialReduxState={{ user: mapUserData(user, session?.access_token, false, null) }}>
      <LabSearchReviewStory />
    </LabSmartAddProviders>
  );
}
