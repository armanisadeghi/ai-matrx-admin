// app/(core)/marketing/layout.tsx
//
// Auth branch for the whole Marketing module, decided SERVER-side (no client
// flash, and the workspace tree never enters a guest's bundle).
//
// Guests get the full marketing landing on ANY /marketing/* URL — never a login
// wall, never an error (`.claude/skills/module-landing-pages`, invariant 1).
// Signed-in users fall through to the real workspace; `AuthedWorkspaceCTA`
// inside ModuleLanding is what gives a signed-in visitor the way in when they
// do land on the pitch.
//
// getServerAuth() is request-scope cached — the (core) layout already called
// it, so this costs nothing.

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BrandsLanding from "@/features/auth/components/module-landing/landings/BrandsLanding";
import MarketingLanding from "@/features/auth/components/module-landing/landings/MarketingLanding";
import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";
import { getMarketingRouteMetadata } from "@/features/marketing/lib/route-metadata";
import { parseMarketingBrandPath } from "@/features/marketing/lib/keys";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { currentRequestLoginHref } from "@/utils/auth/server-login-href";

/** `/marketing/brands/<brand>/…` — a brand workspace address, not a module page. */
function brandAddressOf(pathname: string): string | null {
  return parseMarketingBrandPath(pathname)?.brandSeg ?? null;
}

export async function generateMetadata() {
  const pathname = (await headers()).get("x-pathname") ?? "/marketing";
  // A brand workspace address: read the brand's kind from the SAME React-cached
  // resolve the [brandId] layout does (one query per request, not two).
  const brandPath = parseMarketingBrandPath(pathname);
  const brandSeg =
    brandPath && (brandPath.rest[0] === "identity" || brandPath.rest[0] === "intelligence")
      ? brandPath.brandSeg
      : null;
  let kind: string | null = null;
  if (brandSeg) {
    try {
      kind = (await resolveBrandParam(brandSeg))?.kind ?? null;
    } catch {
      kind = null; // the page itself reports an unreadable brand; the tab falls back to company words
    }
  }
  return getMarketingRouteMetadata(pathname, kind);
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verdict = await getSessionVerdict();
  const { isAuthenticated } = verdict;

  if (!isAuthenticated) {
    // A brand address is a real record behind sign-in: the visitor goes to sign in with the
    // full deep link kept (utils/auth), never the module pitch inside that brand's navigation.
    const pathname = (await headers()).get("x-pathname") ?? "/marketing";
    // Unverified (auth unreachable) is never a signed-out person: no bounce.
    if (verdict.state === "signed_out" && brandAddressOf(pathname)) redirect(await currentRequestLoginHref(pathname));
    // Brands has its own front door (feature-pages contract): the Brands pitch at /marketing/brands.
    return (
      <MarketingPageShell>
        {pathname === "/marketing/brands" ? <BrandsLanding /> : <MarketingLanding />}
      </MarketingPageShell>
    );
  }

  return children;
}
