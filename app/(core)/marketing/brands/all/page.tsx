// /marketing/brands/all — every brand, on the canonical list shell (feature-pages contract).
import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { BrandsListPage } from "@/features/marketing/components/brands/browse/BrandsListPage";

export default async function MarketingBrandsAllPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/marketing/brands");
  return <BrandsListPage />;
}
