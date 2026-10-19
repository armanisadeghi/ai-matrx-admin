"use client";

// features/launchpad/components/LaunchpadsMount.tsx — the records provider every launchpad screen reads under.
// Reads walk every organization the person belongs to; the provider's organization is only where a NEW
// launchpad is written (the active organization). Signed out: the fallback (the page's header alone).
import type { ReactNode } from "react";
import Link from "next/link";
import { RecordsMount } from "@/features/data-tables/records-ui-host/recordsUiLazy";
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
    <RecordsMount letTheStoreDecideRights config={recordsConfig} host={{ Link, density: "condensed" }}>
      {children}
    </RecordsMount>
  ) : (
    <>{fallback}</>
  );
}
