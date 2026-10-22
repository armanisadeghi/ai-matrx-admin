// record-view: none — a connected computer's console; devices are not a registry Entity/Detail table
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { DeviceConsole } from "@/features/files/devices/console/DeviceConsole";
import { consoleDeviceVerdict, fetchConsoleDevice, type ConsoleDeviceVerdict } from "@/features/files/devices/console/devices-query";
import { DeviceUnavailable } from "@/features/files/devices/console/DeviceUnavailable";
import { createDynamicRouteMetadata } from "@/utils/route-metadata";

type Params = Promise<{ deviceId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { deviceId } = await params;
  const supabase = await createClient();
  const { data: claimsUser } = await getClaimsUser(supabase);
  const userId = claimsUser.user?.id ?? null;
  const device = userId ? await fetchConsoleDevice(supabase, userId, deviceId).catch(() => null) : null;
  return createDynamicRouteMetadata("/devices", {
    title: device?.instance_name?.trim() || "Device",
    description: "Terminal and files on this computer",
    letter: "DK",
  });
}

/**
 * The device row is read on the server (its name and platform paint with the page); the live
 * connection is the client's. A device that cannot open says WHY (consoleDeviceVerdict): someone
 * else's device gets the access gate; not found, removed, not a computer and turned off each say so.
 */
export default async function DevicePage({ params }: { params: Params }) {
  const { deviceId } = await params;
  const supabase = await createClient();
  const { data: claimsUser } = await getClaimsUser(supabase);
  const userId = claimsUser.user?.id ?? null;
  let error: unknown = null;
  let verdict: ConsoleDeviceVerdict | null = null;
  if (userId) {
    try {
      verdict = await consoleDeviceVerdict(supabase, userId, deviceId);
    } catch (e) {
      error = e;
    }
  }
  // Signed out, a failed read, or someone else's device: the access gate (it names those). Every other
  // refusal names its real reason (DeviceUnavailable), never a false "no access".
  if (!verdict || verdict.kind === "not_yours") {
    return (
      <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
        <AccessGate token="app_instance" id={deviceId} error={error ?? undefined} fallbackHref="/devices" fallbackLabel="Devices" />
      </div>
    );
  }
  if (verdict.kind !== "ok") {
    return (
      <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
        <DeviceUnavailable verdict={verdict} />
      </div>
    );
  }
  return (
    <Suspense>
      <DeviceConsole key={verdict.device.id} device={verdict.device} />
    </Suspense>
  );
}
