import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";
import { VaultRouteHeader } from "@/features/secrets/components/VaultRouteHeader";
import { VaultRouteBody } from "@/features/secrets/components/WebVault";

/**
 * /vault/authenticator — the Matrx Authenticator: the shared `@ai-matrx/vault`
 * workspace opened on its codes view (rotating codes, Add by camera / QR image /
 * setup key, turn on or off, rename, remove). The address stays here while the
 * Authenticator is open; opening a code's login moves to `/vault/<id>`.
 */
export default async function AuthenticatorRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { isAuthenticated } = await getSessionVerdict();
  if (!isAuthenticated) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) {
      if (typeof v === "string") query.set(k, v);
    }
    const next = `/vault/authenticator${query.size ? `?${query}` : ""}`;
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
