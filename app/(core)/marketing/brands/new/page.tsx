// /marketing/brands/new — Add a brand: Smart Add or by hand, one shared create body (BrandCreatePanel).
import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { BrandNewPage } from "@/features/marketing/components/brands/browse/BrandNewPage";

export default async function MarketingBrandsNewPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/marketing/brands");
  return <BrandNewPage />;
}
