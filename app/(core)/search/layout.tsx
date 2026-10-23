// app/(core)/search/layout.tsx
//
// /search — one URL, two audiences (module-landing-pages doctrine).
//
// A guest searches for free (cheap engine, the free allowance counts it) and is NEVER
// bounced to a login wall. A signed-in visitor gets the search engine itself
// at the same URL, so a shared `/search?q=…` link keeps working for both: the
// guest reads what it is, signs in, and lands back on the search they were
// sent.
//
// The auth branch is made server-side (`getServerAuth()` is request-scope
// cached — the parent layout already paid for it), so the workspace tree and
// the landing tree never leak into each other's bundle.

import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { MarketingPageShell } from "@/features/shell/components/MarketingPageShell";
import { GuestSearch } from "@/features/search/components/GuestSearch";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/search", {
  title: "Matrx Search",
  description:
    "Search the web and get finished pieces back — direct answers, places with hours and ratings, news, video and discussions. Every search keeps its own link.",
  letter: "Sr",
  canonicalPath: "/search",
  keywords: ["search", "web search", "AI search", "Matrx Search"],
});

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getSessionVerdict();

  if (!isAuthenticated) {
    return (
      <MarketingPageShell>
        <GuestSearch />
      </MarketingPageShell>
    );
  }

  // Every page here names its levels through the derived trail; a page with its own header draws it

  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).

  return (

    <>

      <DerivedCrumbTrailHeader fallback />

      {children}

    </>

  );
}
