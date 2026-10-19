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
