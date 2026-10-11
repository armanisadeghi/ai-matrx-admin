// /education/game/host — create a multiplayer room. HostSetupImpl is a light
// "use client" leaf (no browser-only APIs at import time), so importing it here
// forms the client boundary and Next.js code-splits it automatically.
import type { Metadata } from "next";
// eslint-disable-next-line no-restricted-syntax -- HostSetupImpl has no dynamic wrapper sibling; this page IS its client boundary (see header comment), so Next code-splits it per route.
import { HostSetupImpl } from "@/features/education/engage/components/lobby/HostSetupImpl";

export const metadata: Metadata = {
  title: "Host a Game — Study Games",
};

export default async function HostGamePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // `?set=<deckId>` — "Play live" from a deck preselects that deck.
  const sp = await searchParams;
  const setId = typeof sp.set === "string" && sp.set ? sp.set : null;
  return (
    <div className="h-full overflow-hidden">
      <HostSetupImpl initialSetId={setId} />
    </div>
  );
}
