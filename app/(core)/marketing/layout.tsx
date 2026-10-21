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

import MarketingLanding from "@/features/auth/components/module-landing/landings/MarketingLanding";
import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";
import { getMarketingRouteMetadata } from "@/features/marketing/lib/route-metadata";
import { MARKETING_RESERVED_SEGMENTS } from "@/features/marketing/lib/keys";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { currentRequestLoginHref } from "@/utils/auth/server-login-href";

/** Static route folders under /marketing that the reserved-key list does not carry. */
const STATIC_MARKETING_SEGMENTS: ReadonlySet<string> = new Set(["ai-visibility"]);

/** `/marketing/<brand>/…` — a client workspace address, not a module page. */
function brandAddressOf(pathname: string): string | null {
  const seg = /^\/marketing\/([^/?#]+)/.exec(pathname)?.[1];
  if (!seg || MARKETING_RESERVED_SEGMENTS.has(seg) || STATIC_MARKETING_SEGMENTS.has(seg)) return null;
  return seg;
}

export async function generateMetadata() {
  const pathname = (await headers()).get("x-pathname") ?? "/marketing";
  // A client workspace address: read the brand's kind from the SAME React-cached
  // resolve the [brandId] layout does (one query per request, not two).
  const brandSeg = /^\/marketing\/([^/]+)\/(identity|intelligence)(\/|$)/.exec(pathname)?.[1];
  let kind: string | null = null;
  if (brandSeg && !MARKETING_RESERVED_SEGMENTS.has(brandSeg)) {
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
    // A client address is a real record behind sign-in: the visitor goes to sign in with the
    // full deep link kept (utils/auth), never the module pitch inside that client's navigation.
    const pathname = (await headers()).get("x-pathname") ?? "/marketing";
    // Unverified (auth unreachable) is never a signed-out person: no bounce.
    if (verdict.state === "signed_out" && brandAddressOf(pathname)) redirect(await currentRequestLoginHref(pathname));
    return (
      <MarketingPageShell>
        <MarketingLanding />
      </MarketingPageShell>
    );
  }

  return children;
}
