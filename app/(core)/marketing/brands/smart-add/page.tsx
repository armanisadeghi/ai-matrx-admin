import { SmartAddBrandPage } from "@/features/marketing/smart-add/SmartAddBrandPage";

export const metadata = { title: "Smart Add brand" };

/** Smart Add: paste a website or social link and confirm what we find (a static child of /brands). */
export default function SmartAddBrandRoute() {
  return <SmartAddBrandPage />;
}
