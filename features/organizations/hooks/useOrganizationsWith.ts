"use client";

// useOrganizationsWith — the organizations a screen NAMES, resolved by id (bounded organizations,
// 2026-10-17). The drop-in for `useUserOrganizations()` wherever a screen only needs to label a
// record's organization or ask "am I a member of X": `organizations` is her first page PLUS every
// named id she belongs to that is not on that page (one `iam.my_organizations_by_ids` call, shared
// and cached). It is NOT her whole list — never enumerate it into a picker or a membership filter
// (`usePagedOrganizations` is the picker's source).

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useUserOrganizations } from "@/features/organizations/hooks";
import {
  lookupFailed,
  lookupOrganizations,
  organizationLookupVersion,
  peekOrganization,
  rememberOrganizations,
  subscribeOrganizationLookup,
} from "@/features/organizations/service/organizationLookup";
import type { OrganizationWithRole } from "@/features/organizations/types";
import type { OrganizationArchiveFilter } from "@/features/organizations/service/organizationArchive";
import { DEFAULT_ARCHIVE_FILTER } from "@ai-matrx/design-system/archive-filter";

type MaybeId = string | null | undefined;

export function mergeNamedOrganizations(
  page: readonly OrganizationWithRole[],
  namedIds: readonly string[],
  peek: (id: string) => OrganizationWithRole | null | undefined,
): OrganizationWithRole[] {
  const have = new Set(page.map((o) => o.id));
  const extra: OrganizationWithRole[] = [];
  for (const id of namedIds) {
    if (have.has(id)) continue;
    const org = peek(id);
    if (org) {
      extra.push(org);
      have.add(id);
    }
  }
  return extra.length === 0 ? (page as OrganizationWithRole[]) : [...page, ...extra];
}

export function useOrganizationsWith(ids: readonly MaybeId[], archiveFilter: OrganizationArchiveFilter = DEFAULT_ARCHIVE_FILTER) {
  const base = useUserOrganizations(archiveFilter);
  const key = [...new Set(ids.filter((id): id is string => Boolean(id)))].sort().join(",");
  useSyncExternalStore(subscribeOrganizationLookup, organizationLookupVersion, organizationLookupVersion);

  useEffect(() => {
    rememberOrganizations(base.organizations);
  }, [base.organizations]);

  useEffect(() => {
    if (base.loading || !key) return;
    void lookupOrganizations(key.split(","));
  }, [base.loading, key]);

  const organizations = useMemo(
    () => mergeNamedOrganizations(base.organizations, key ? key.split(",") : [], peekOrganization),
    // `organizationLookupVersion()` changes when an answer lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.organizations, key, organizationLookupVersion()],
  );
  const pending = key ? key.split(",").some((id) => !base.organizations.some((o) => o.id === id) && peekOrganization(id) === undefined && !lookupFailed(id)) : false;

  return { ...base, organizations, loading: base.loading || pending };
}
