// record-view: none — a list of connected computers
import { getClaimsUser } from "@ai-matrx/auth";
import { createClient } from "@/utils/supabase/server";
import { DeviceList } from "@/features/files/devices/console/DeviceList";
import { fetchConsoleDevices } from "@/features/files/devices/console/devices-query";
import type { DeviceRow } from "@/features/files/devices/types";

/** Server-rendered list (no layout shift); the relay's live dots fill in on the client. */
export default async function DevicesPage() {
  const supabase = await createClient();
  const { data: claimsUser } = await getClaimsUser(supabase);
  const userId = claimsUser.user?.id ?? null;
  let devices: DeviceRow[] = [];
  let error: string | null = null;
  if (userId) {
    try {
      devices = await fetchConsoleDevices(supabase, userId);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load your devices";
    }
  }
  return <DeviceList devices={devices} error={error} />;
}
