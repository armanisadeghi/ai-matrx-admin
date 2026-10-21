"use client";

// A person named on a record tab, as THIS seat may open them. Platform admins get AdminUserRef (the
// admin peek and door menu). An organization's admins get the person's name from that
// organization's roster, linking to their member page there; AdminUserRef's doors would be a 403 for
// them (features/organizations/admin/routes.ts). Someone outside the roster is named by the email
// the read returned, or "Not a member", never a bare id.

import { useEffect, useState } from "react";
import AppLink from "@/components/navigation/AppLink";
import { listOrgMembers } from "@/features/organizations/admin/service";
import { orgAdminMemberHref } from "@/features/organizations/admin/routes";
import type { OrgAdminMember } from "@/features/organizations/admin/types";
import { AdminUserRef } from "../components/AdminUserRef";
import type { UserRecordScope } from "./userSurfaces";

// One roster read per organization per tab session; a failed read is forgotten so the next mount retries.
const rosters = new Map<string, Promise<Map<string, OrgAdminMember>>>();

function rosterOf(orgId: string): Promise<Map<string, OrgAdminMember>> {
  const known = rosters.get(orgId);
  if (known) return known;
  const pending = listOrgMembers(orgId).then((members) => new Map(members.map((m) => [m.userId, m])));
  rosters.set(orgId, pending);
  pending.catch(() => rosters.delete(orgId));
  return pending;
}

function OrganizationPersonRef({ userId, email, orgId, orgSlug }: { userId: string; email?: string | null; orgId: string; orgSlug: string }) {
  const [member, setMember] = useState<OrgAdminMember | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    rosterOf(orgId).then(
      (roster) => live && setMember(roster.get(userId) ?? null),
      () => live && setMember(null),
    );
    return () => {
      live = false;
    };
  }, [orgId, userId]);

  if (member) {
    return (
      <AppLink href={orgAdminMemberHref(orgSlug, userId)} className="truncate hover:text-primary">
        {member.displayName || member.email || "Member"}
      </AppLink>
    );
  }
  return <span className="truncate">{email || (member === undefined ? "…" : "Not a member")}</span>;
}

export function ScopedPersonRef({
  userId,
  scope,
  name,
  email,
}: {
  userId: string;
  scope: UserRecordScope;
  name?: string;
  email?: string | null;
}) {
  if (scope.kind === "platform") return <AdminUserRef userId={userId} name={name} hideEmail />;
  return <OrganizationPersonRef userId={userId} email={email} orgId={scope.orgId} orgSlug={scope.orgSlug} />;
}
