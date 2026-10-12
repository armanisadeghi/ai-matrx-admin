import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { decodeOfficeLookCookie, OFFICE_LOOK_COOKIE } from "./office-look-cookie";
import { OfficeLookSeedProvider } from "./office-look-seed";

/**
 * Server wrapper for the Workbooks / Documents / Presentations layouts: reads the person's Office
 * look cookie so the home and editor are drawn in their look from the first frame.
 */
export async function OfficeLookSeed({ userId, children }: { userId: string; children: ReactNode }) {
  const raw = (await cookies()).get(OFFICE_LOOK_COOKIE)?.value;
  return <OfficeLookSeedProvider seed={decodeOfficeLookCookie(raw, userId)}>{children}</OfficeLookSeedProvider>;
}
