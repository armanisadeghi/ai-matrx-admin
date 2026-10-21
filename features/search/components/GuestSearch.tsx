"use client";

/**
 * `/search` for a visitor with no account: the same `SearchExperience`, on the cheap engine, under the
 * server's free allowance (feature "search"). No guest session is made — the request goes out on the
 * browser's visitor lane (fingerprint), exactly like the other public doors. Tabs that need an account
 * are not offered; when the day's free searches are used, the answer says so with a "Sign up free" link.
 */

import { useSearchRoute } from "@/features/search/hooks/useSearchRoute";
import { SearchExperience } from "./SearchExperience";

export function GuestSearch() {
  const { form, inputs } = useSearchRoute({ guest: true });
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-textured" style={{ paddingTop: "var(--shell-header-h)" }}>
      <SearchExperience form={form} inputs={inputs} surface="search" guest />
    </div>
  );
}
