// /visual-maps/lab — the Visual map lab front door. Signed-in people go straight to the list at /all, decided on the
// server so nothing flashes; the layout gates guests.
import { redirect } from "next/navigation";
import { LabFrontDoor } from "@/features/visual-map-lab/LabFrontDoor";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Visual map lab" };

export default async function VisualMapLabPage() {
  const { isAuthenticated } = await getSessionVerdict();
  if (isAuthenticated) redirect("/visual-maps/lab/all");
  return <LabFrontDoor />;
}
