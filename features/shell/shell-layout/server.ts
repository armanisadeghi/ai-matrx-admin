// features/shell/shell-layout/server.ts — THE SERVER PICK (custom-experience §5.3), for the (core) layout.
//
// Called once per signed-in (core) render, after the layout's one parallel round: it reads two cookies and
// the boot seed it already has — no request of its own. Everyone without a layout pays two cookie reads
// and a null check. The result is the `shellLayout` slice's initial state: the shell's renderers read
// it from the store, so the server render and the first client render are the same tree (no shift, no
// hydration mismatch). Guests never call this.
//
//   - `matrx_shell_view=standard` (the Standard view switch) → the built-in default;
//   - the seed answered → the person's layout, else the predicted organization's, else the default;
//   - the seed missed its deadline and `matrx_shell=1` says this browser holds a custom layout → the nav
//     column renders a fixed-height reserve (the admin-footer-reserve precedent) instead of the default
//     and then a swap; with no cookie the default renders at once.

import "server-only";
import { cookies } from "next/headers";
import { predictedOrganizationId } from "@/lib/boot/coreBootSeed.server";
import type { CoreBootSeed } from "@/lib/boot/coreBootSeedShape";
import { SHELL_CUSTOM_COOKIE, SHELL_VIEW_COOKIE } from "./contract";
import { seedShellLayoutState, type ShellLayoutState } from "./shellLayoutSlice";
import { parseShellBootSeed } from "./seed";
import { shellLandingHref } from "./resolve";
import { parseShellLayoutBody } from "./validate";

export async function pickShellLayoutServer(seed: CoreBootSeed | null, search: string | null): Promise<ShellLayoutState> {
  const jar = await cookies();
  const standardView = jar.get(SHELL_VIEW_COOKIE)?.value === "standard";
  const customized = jar.get(SHELL_CUSTOM_COOKIE)?.value === "1";
  return seedShellLayoutState({
    seed: seed?.shell ?? null,
    seedLanded: seed !== null,
    // Only a seed carrying a layout needs the prediction (it picks the organization's layout).
    organizationId: seed?.shell ? predictedOrganizationId(seed, search) : null,
    standardView,
    reserved: seed === null && customized && !standardView,
  });
}

type RpcClient = {
  schema(name: string): unknown;
};

/**
 * Where a sign-in with NO explicit destination lands: the person's layout's `landing`, else the landing
 * every one of her organizations' layouts agrees on; null = the platform default. An explicit destination
 * (a bounced person's `redirectTo`) always wins — callers ask this only when there is none
 * (utils/auth/FEATURE.md). One small RPC on the sign-in path only; a failure is the default, loudly.
 */
export async function shellLandingAfterSignIn(supabase: RpcClient): Promise<string | null> {
  try {
    const answer = await (supabase.schema("iam") as {
      rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    }).rpc("shell_layout_seed", { p_organization_ids: null });
    if (answer.error) {
      console.warn(`[shell-layout] landing read failed (${answer.error.message}); the default destination is used`);
      return null;
    }
    const seed = parseShellBootSeed(answer.data, "iam.shell_layout_seed() at sign-in");
    if (!seed) return null;
    const landingOf = (body: string) => shellLandingHref(parseShellLayoutBody(body).body?.landing ?? null);
    if (seed.person) return landingOf(seed.person.body);
    const orgLandings = new Set(Object.values(seed.organizations).map((o) => landingOf(o.body)));
    return orgLandings.size === 1 ? ([...orgLandings][0] ?? null) : null;
  } catch (error) {
    console.warn("[shell-layout] landing read threw; the default destination is used", error);
    return null;
  }
}
