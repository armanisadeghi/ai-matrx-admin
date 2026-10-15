// HELD TEST RUNS DO NOT HOT-RELOAD (development only, 2026-10-15).
//
// The shared preview serves ~30 sessions' live edits. Next's hot-reload client reloads the whole
// page when an edit cannot be hot-swapped, when the server restarts, or after too many failed
// reconnects — so a test run's page was reloaded mid-step by OTHER sessions' work (measured: a
// refactor of shared rendering code changed 158 files in 10 min and reloaded every open page).
// For a host that a test run HOLDS (`pnpm preview:ready` / `pnpm preview:hold`), this script hands
// Next's hot-reload client a socket that opens and stays silent: no update, no restart signal, no
// reload. The run still gets current code on its next navigation. Nothing changes for anyone else,
// and nothing is rendered outside `next dev`.
import { headers } from "next/headers";
import { HELD_RUN_HMR_SCRIPT } from "./heldRunHmrScript";



export async function HeldRunHmrGuard() {
  if (process.env.NODE_ENV !== "development") return null;
  const host = (await headers()).get("host");
  if (!host || !/\.localhost(:\d+)?$/.test(host)) return null;
  const { isHeldPreviewHost } = await import("@/utils/supabase/walkCap");
  if (!isHeldPreviewHost(host)) return null;
  return <script dangerouslySetInnerHTML={{ __html: HELD_RUN_HMR_SCRIPT }} />;
}
