// Smart Add Brand — local test page for the REAL component
// (features/marketing/smart-add/SmartAddBrand.tsx), on real data: the live
// database as the signed-in person, and the aidream server picked below
// (live, or this computer at localhost:8000 — `python run.py` in aidream).
// Nothing is created until "Create brand"; it lands in the active organization.
import { LabSmartAddProviders } from "./LabSmartAddProviders";
import { createClient } from "@/utils/supabase/server";
import { getServerAuth } from "@/utils/supabase/getServerAuth";
import { mapUserData } from "@/utils/userDataMapper";
import { getAdminStatus } from "@/utils/supabase/userSessionData";
import { LabSmartAddBrand } from "./LabSmartAddBrand";

export const metadata = { title: "Smart Add Brand" };

export default async function LabSmartAddBrandPage() {
  const { user } = await getServerAuth();
  if (!user) {
    return (
      <main className="p-6 text-sm text-muted-foreground">
        Sign in first, then reload. <a className="text-primary" href="/login?redirectTo=/lab/smart-add-brand">Sign in</a>
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
      <LabSmartAddBrand />
    </LabSmartAddProviders>
  );
}
