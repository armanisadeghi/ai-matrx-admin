/**
 * ForbiddenSurface — the app's server seam for the access gate's "forbidden" boundary.
 *
 * Every `forbidden.tsx` renders this when a Server Component calls Next's `forbidden()` (see
 * `requireAccess(..., { forbid: true })`). The SCREEN is `ForbiddenSurfaceView` in
 * `@ai-matrx/sharing/access/react` (its file explains why the boundary cannot name the record, and
 * why nobody should try); this wrapper only reads what a package cannot — the three-state session
 * verdict, the request path `proxy.ts` stamps on every request, and the sign-in link that returns
 * the person to it.
 */
import "server-only";
import { headers } from "next/headers";
import { ForbiddenSurfaceView } from "@ai-matrx/sharing/access/react";
import { readSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { captureAuthDestination, loginHref } from "@/utils/auth/auth-destination";

export async function ForbiddenSurface() {
  const [verdict, headerList] = await Promise.all([readSessionVerdict(), headers()]);
  const pathname = headerList.get("x-pathname") || "/dashboard";
  const search = headerList.get("x-search-params") || "";
  return (
    <ForbiddenSurfaceView
      state={verdict.state === "signed_in" ? "authenticated" : verdict.state === "signed_out" ? "anonymous" : "unverified"}
      isAuthenticated={verdict.isAuthenticated}
      pathname={pathname}
      search={search}
      signInHref={loginHref(captureAuthDestination(pathname, search))}
    />
  );
}
