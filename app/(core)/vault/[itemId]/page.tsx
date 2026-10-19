// record-view: none — a redirect to the page that shows the record
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { VaultRouteHeader } from "@/features/secrets/components/VaultRouteHeader";
import { VaultRouteBody } from "@/features/secrets/components/WebVault";

export const metadata: Metadata = {
  title: "Credential | Vault | AI Matrx",
};

/** /vault/[itemId] — the canonical door to one credential (THE DOOR LAW). */
export default async function VaultItemRoute({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { itemId } = await params;
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
      if (typeof v === "string") query.set(k, v);
    }
    const next = `/vault/${encodeURIComponent(itemId)}${query.size ? `?${query}` : ""}`;
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
