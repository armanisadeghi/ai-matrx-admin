// app/(core)/data/get/page.tsx — THE MOUNT for "Get data" outside a board (the paste offer in chat,
// the Source input's Data tile). The page is features/data-sources/GetDataPage.tsx.

import { redirect } from "next/navigation";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { loginHref } from "@/utils/auth/auth-destination";
import { GetDataPage } from "@/features/data-sources/GetDataPage";

export default async function GetDataRoutePage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect(loginHref("/data/get"));
  return <GetDataPage />;
}
