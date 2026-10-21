"use client";

// ShellLayoutMount — the records provider the layout editors read under. A person's layout is written in
// the active organization (where new things are saved) unless it already lives elsewhere; an organization's
// layout is written in THAT organization (the settings page names it).
//
// The plain `RecordsProvider` (a client in context), never the records-ui front door: the editors draw no
// records-ui screen, and the front door's lazy chunk (charts, maths, citations…) held the editor's first
// open for ~1.3 s on a cold page (2026-10-19).
import type { ReactNode } from "react";
import { RecordsProvider } from "@ai-matrx/records/react";
import { useAppRecordsConfig } from "@/features/data-tables/records-ui-host/appRecordsConfig";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";

export function ShellLayoutMount({ organizationId, children }: { organizationId?: string | null; children: ReactNode }) {
  // org-filter: write-target — where a first layout is saved, or the organization whose layout this is
  const active = useOrganizationRequired();
  const recordsConfig = useAppRecordsConfig(organizationId ?? active.organizationId ?? null);
  return <RecordsProvider config={recordsConfig}>{children}</RecordsProvider>;
}
