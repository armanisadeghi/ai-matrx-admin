"use client";

// ShellLayoutMount — the records provider the layout editors read under. A person's layout is written in
// the active organization (where new things are saved) unless it already lives elsewhere; an organization's
// layout is written in THAT organization (the settings page names it).
import type { ReactNode } from "react";
import Link from "next/link";
import { RecordsMount } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";

export function ShellLayoutMount({ organizationId, children }: { organizationId?: string | null; children: ReactNode }) {
  // org-filter: write-target — where a first layout is saved, or the organization whose layout this is
  const active = useOrganizationRequired();
  const recordsConfig = useAppRecordsConfig(organizationId ?? active.organizationId ?? null);
  return (
    <RecordsMount letTheStoreDecideRights config={recordsConfig} host={{ Link, density: "condensed" }}>
      {children}
    </RecordsMount>
  );
}
