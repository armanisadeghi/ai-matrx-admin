import "server-only";

// The (core) layout's read of frame vs classic for THIS hard load (rules: frameMode.ts). Reads the
// query string from `x-search-params` (layouts get no searchParams) and the `matrx_frame` cookie the
// middleware maintains; the kill-switch knob is read ONLY when the answer would be "frame", so
// everyone on the classic shell pays nothing.
import { cookies, headers } from "next/headers";
import { readEffectiveKnobOnServer } from "@/lib/scoped-config/effectiveKnobs.server";
import { FRAME_COOKIE, FRAME_KILL_SWITCH_KNOB, FRAME_ROLLOUT, pickFrameMode, rolloutAdmits } from "./frameMode";
import type { FrameMode } from "./frameMode";

export async function readFrameMode(who: { isAuthenticated: boolean; isAdmin: boolean }): Promise<FrameMode> {
  if (!rolloutAdmits(FRAME_ROLLOUT, who)) return "classic";
  const [headerList, jar] = await Promise.all([headers(), cookies()]);
  const mode = pickFrameMode({
    search: headerList.get("x-search-params"),
    cookie: jar.get(FRAME_COOKIE)?.value,
    ...who,
  });
  if (mode !== "frame") return mode;
  // THE KILL SWITCH IS FAIL-OPEN BY DESIGN: only an explicit `false` turns the frame off. A read
  // that does not answer (the knob RPC failed, the row is missing → undefined) keeps the person's
  // own choice, so a knob outage never yanks an admin's layout mid-session; the failed read is
  // already logged by readEffectiveKnobOnServer. Tested: __tests__/frame-mode-server.test.ts.
  const enabled = await readEffectiveKnobOnServer(FRAME_KILL_SWITCH_KNOB);
  return enabled === false ? "classic" : "frame";
}
