"use client";

// OrganizationPickerPanel — the canonical "choose your organization" body.
// It is the platform's ONE shared control (`OrganizationPicker` from
// `@ai-matrx/design-system`, identical in Workflow Studio's sidebar and the
// admin dashboard's settings) bound to THIS app's state: active org from
// appContextSlice, memberships from the scope tree, favorites from the
// canonical favorites store, writes via the sanctioned switcher. Rendered inside the header
// reminder's popover and the user menu; reusable anywhere an org chooser is
// needed. The choice also lands in the shared apex cookie (via
// `activeOrgCookieMiddleware`), so Studio wakes up in the same organization.

import { OrganizationPicker } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useActiveOrganizationPicker } from "@/features/organizations/hooks/useActiveOrganizationPicker";
import { useOrganizationFavorites } from "@/features/organizations/hooks/useOrganizationFavorites";
import { pagedPickerProps, usePagedOrganizations } from "@/features/organizations/hooks/usePagedOrganizations";
import type { OrganizationWithRole } from "@/features/organizations/types";

// 🚨 BOUNDED (2026-10-16): the rows are the shared FIRST PAGE of her live organizations by last
// use (`usePagedOrganizations`), never the whole list. When it is a page, the picker's search goes
// to the server and "Show more" pages it (`OrganizationPicker`'s `more`).

export function OrganizationPickerPanel({
  hideHeading = false,
  itemClassName,
}: {
  hideHeading?: boolean;
  itemClassName?: string;
}) {
  const { activeOrgId, selectOrganization } = useActiveOrganizationPicker({ load: false });
  const paged = usePagedOrganizations();
  const userId = useAppSelector(selectUserId);
  const { favoriteIds, toggleFavorite } = useOrganizationFavorites();

  return (
    <OrganizationPicker
      hideHeading={hideHeading}
      itemClassName={itemClassName}
      organizations={toPickerOrganizations(paged.organizations.map((org) => toPickerSource(org, userId)))}
      activeOrganizationId={activeOrgId}
      favoriteOrganizationIds={favoriteIds}
      loading={paged.loading}
      loadFailed={Boolean(paged.error) && paged.organizations.length === 0}
      {...pagedPickerProps(paged)}
      onSelect={(org) => selectOrganization(org.id, org.name)}
      onToggleFavorite={toggleFavorite}
    />
  );
}

/** What the picker needs of an organization — a scope-tree node and a page row both carry it. */
type PickerSourceOrganization = {
  id: string;
  name: string;
  abbreviation?: string | null;
  slug: string;
  is_test_fixture?: boolean;
  is_own?: boolean;
};

/** A page row → the picker's source shape (the same classification the scope tree stores). */
function toPickerSource(org: OrganizationWithRole, viewerId: string | null): PickerSourceOrganization {
  const settings = org.settings as Record<string, unknown> | undefined;
  return {
    id: org.id,
    name: org.name,
    abbreviation: org.abbreviation,
    slug: org.slug,
    is_test_fixture: !!settings && typeof settings === "object" && "test_fixture" in settings,
    is_own: !!org.createdBy && org.createdBy === viewerId,
  };
}

/**
 * A membership as the shared `OrganizationPicker` draws it. ONE mapping, used
 * by every host of the picker in this app (header, user menu, Settings'
 * preselected organization row), so the same list reads the same everywhere.
 */
export function toPickerOrganizations(
  organizations: readonly PickerSourceOrganization[],
) {
  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    abbreviation: org.abbreviation,
    // 🚨 THE ADDRESS, FOR TWO THAT SHARE A NAME (crew D2, 2026-09-21).
    //
    // Two organizations called "Kessler Lab for Applied Microbial Ecology" and two
    // called "Wraithmoor Regional Museum of Art & Craft" sat in this list, identical
    // down to the abbreviation tile, and a person had no way of knowing which one
    // they were about to work in. The slug is what differs, and it is what the URL
    // already shows — the same thing Slack does with a workspace's address and
    // Google with an account's email. The picker draws it ONLY on rows whose name
    // another row also carries, so a list of distinct names is unchanged.
    distinguisher: org.slug,
    // 🚨 116 ORGANIZATIONS, 59 OF THEM LANE SCRATCH (VERIFIER-8 MEDIUM-3).
    // The classification is the stored one (`settings.test_fixture`) — the
    // picker hides these behind the archived-items disclosure and says how
    // many it hid. Nothing here reads a NAME to decide what a row is.
    isTestFixture: org.is_test_fixture,
    // The person's own organizations come first, under the starred one.
    isOwn: org.is_own,
  }));
}
