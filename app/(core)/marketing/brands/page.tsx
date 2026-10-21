// /marketing/brands — the Brands front door. Guests get the Brands landing (the marketing layout renders it
// for guests; BrandsLanding is also named here so the page owns its guest face); signed-in people go straight
// to the list at /all, decided on the server so nothing flashes.
import { redirect } from "next/navigation";
import BrandsLanding from "@/features/auth/components/module-landing/landings/BrandsLanding";
import { BrandsFrontDoor } from "@/features/marketing/components/brands/browse/BrandsFrontDoor";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export default async function MarketingBrandsPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (isAuthenticated) redirect("/marketing/brands/all");
  return (
    <BrandsFrontDoor>
      <BrandsLanding />
    </BrandsFrontDoor>
  );
}
