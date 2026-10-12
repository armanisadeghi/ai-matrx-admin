/**
 * DEV GUARD: a mounted surface with no `ui.ui_surface` row. Every agent send
 * from such a surface fails with "Surface '<name>' is not registered in
 * ui.ui_surface." (2026-10-10: marketing-social-outliers / -kpis / -swipe /
 * -ads shipped with manifests and no rows). The release applies the sync
 * (`scripts/check-release-surface-registration.ts --apply`); this makes the
 * gap loud in the browser console on a dev build before anyone presses Send.
 */
import {
  getGlobalSurfaceRegistry,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { getSurfaceByName } from "@ai-matrx/chat/surfaces/services/surfaces.service";

export const MISSING_SURFACE_ROW_MESSAGE = (name: string): string =>
  `SURFACE ROW MISSING: '${name}' is mounted but has no ui.ui_surface row — every agent send from it will fail with "Surface '${name}' is not registered in ui.ui_surface." Fix: pnpm exec tsx scripts/sync-surface-manifests-direct.ts --surface ${name}`;

/** Names in `mounted` that `exists` reports absent; each name is asked once (`seen`). */
export async function findMissingSurfaceRows(
  mounted: readonly string[],
  exists: (name: string) => Promise<boolean>,
  seen: Set<string>,
): Promise<string[]> {
  const missing: string[] = [];
  for (const name of new Set(mounted)) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(await exists(name))) missing.push(name);
  }
  return missing;
}

/**
 * The existence probe. A signed-out visitor (a public share page) cannot read
 * `ui.ui_surface` — the lookup is a 401 that lands in the console and the dev
 * "Issue" pill — so it is not asked at all; it is asked again after sign-in.
 */
export function makeSurfaceExists(
  lookup: (name: string) => Promise<unknown | null>,
  signedIn: () => Promise<boolean>,
  seen: Set<string>,
): (name: string) => Promise<boolean> {
  return async (name) => {
    try {
      if (!(await signedIn())) {
        seen.delete(name);
        return true;
      }
      return (await lookup(name)) !== null;
    } catch {
      seen.delete(name); // an unreadable lookup is not "missing"; ask again later
      return true;
    }
  };
}

export function installSurfaceRowGuard(
  report: (message: string) => void = (m) => console.error(m),
): () => void {
  if (process.env.NODE_ENV === "production") return () => {};
  const seen = new Set<string>();
  const registry = getGlobalSurfaceRegistry();
  const exists = makeSurfaceExists(
    getSurfaceByName,
    async () => Boolean((await getClaimsUser(supabase)).data?.user?.id),
    seen,
  );
  const check = () => {
    void findMissingSurfaceRows(
      registry.depths().map((entry) => entry.surfaceName),
      exists,
      seen,
    ).then((missing) => {
      for (const name of missing) report(MISSING_SURFACE_ROW_MESSAGE(name));
    });
  };
  check();
  return registry.subscribe(check);
}
