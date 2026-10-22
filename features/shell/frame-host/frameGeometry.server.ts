import "server-only";

// The server's read of the app frame's remembered geometry (ROLLOUT-PLAN Attack #4): the host
// layout passes the result to the frame as `initialGeometry`, so the sidebar width and the side chat
// width are right in the FIRST paint — the same rule the live
// dock follows (AppShell reads `side-panel:<id>:width` and the per-home chat cookie).
import { cookies } from "next/headers";
import { frameGeometryFromCookies } from "@/features/shell/frame/geometry";
import type { FrameInitialGeometry } from "@/features/shell/frame/geometry";

export async function readFrameGeometry(): Promise<FrameInitialGeometry> {
  const store = await cookies();
  return frameGeometryFromCookies((name) => store.get(name)?.value);
}
