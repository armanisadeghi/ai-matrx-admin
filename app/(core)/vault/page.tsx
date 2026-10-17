import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { VaultRouteHeader } from "@/features/secrets/components/VaultRouteHeader";
import { VaultRouteBody } from "@/features/secrets/components/WebVault";

export const metadata: Metadata = {
  title: "Vault | AI Matrx",
};

/**
 * /vault — Vault, the canonical home for everything the platform signs in
 * with. Renders the shared `@ai-matrx/vault` workspace; the address carries
 * vault, view, search, sort, mode and the open panel (`?view=authenticator`,
 * `?panel=approve:<key>`, …). `/vault/[itemId]` opens one item.
 */
export default async function VaultRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    // Keep the whole address (an approve-browser link carries its key here).
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
      if (typeof v === "string") query.set(k, v);
    }
    const next = `/vault${query.size ? `?${query}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <VaultRouteHeader />
      <Suspense>
        <VaultRouteBody />
      </Suspense>
    </>
  );
}
