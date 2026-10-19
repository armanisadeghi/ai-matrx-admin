"use client";

// features/launchpad/components/LaunchpadsMount.tsx — the records provider every launchpad screen reads under.
// Reads walk every organization the person belongs to; the provider's organization is only where a NEW
// launchpad is written (the active organization). Signed out: the fallback (the page's header alone).
//
// The plain `RecordsProvider` (a client in context), never the records-ui front door: launchpads draw no
// records-ui screen, and the front door's lazy chunk (~1.7 MB) rendered NOTHING until it loaded — the
// launchpad's server paint was replaced by a blank page for seconds on every load (2026-10-19).
import type { ReactNode } from "react";
import { RecordsProvider } from "@ai-matrx/records/react";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

export function LaunchpadsMount({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const userId = useAppSelector(selectUserId);
  // org-filter: write-target — a new launchpad is saved where new things are saved; reads walk every organization
  const active = useOrganizationRequired();
  const recordsConfig = useAppRecordsConfig(active.organizationId ?? null);
  return userId ? (
    <RecordsProvider config={recordsConfig}>{children}</RecordsProvider>
  ) : (
    <>{fallback}</>
  );
}
