// /visual-maps/lab/all — every sample, on the canonical list shell.
import { redirect } from "next/navigation";
import { LabListPage } from "@/features/visual-map-lab/LabListPage";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export default async function VisualMapLabAllPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) redirect("/visual-maps/lab");
  return <LabListPage />;
}
