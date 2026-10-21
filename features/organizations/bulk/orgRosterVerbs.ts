/**
 * orgRosterVerbs — THE BULK TWIN RULE for the org Members and Invitations
 * lists. Each verb is declared once here with its bulk twin; the lists render
 * the twins through the shared panels' `bulk` prop. The server (mbr_* / inv_*
 * doors) stays the authority: a refusal is skipped and named per row.
 */
import { Archive, ArchiveRestore, Shield, UserX, RefreshCw, X } from "lucide-react";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import type { PanelMember } from "@/components/membership/MembersPanel";
import type { PanelInvitation } from "@/components/membership/InvitationsPanel";
import {
  cancelInvitation,
  removeMember,
  resendInvitation,
  updateMemberRole,
} from "../service";
import type { OrgRole } from "../types";
import {
  archiveTeam,
  removeTeamMember,
  restoreTeam,
  setTeamMemberRole,
  type Team,
  type TeamMember,
  type TeamRole,
} from "../service/teamsService";

export const MEMBER_BULK_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
] as const;

const memberName = (m: PanelMember) =>
  m.user?.displayName ?? m.user?.email ?? "A member";

function must(result: { success: boolean; error?: string }, fallback: string) {
  if (!result.success) throw new Error(result.error || fallback);
}

/** Set role / Remove for the org Members list. */
export function orgMemberBulkActions(args: {
  organizationId: string;
  canManage: (m: PanelMember) => boolean;
  ownerCount: number;
  onRoleChange?: (m: PanelMember) => void;
  onRemove?: (m: PanelMember) => void;
}): EntityBulkAction<PanelMember>[] {
  const { organizationId, canManage, ownerCount } = args;
  const refusal = (m: PanelMember): string | null => {
    if (!canManage(m)) return "Only the owner can change this member";
    if (m.role === "owner" && ownerCount <= 1) return "Last owner";
    return null;
  };
  return defineRowVerbs<PanelMember>(
    [
      {
        id: "set-role",
        icon: Shield,
        label: "Set role",
        appliesTo: (m) => refusal(m) === null && m.role !== "owner",
        unavailableTooltip: "The owner changes through Transfer ownership",
        onClick: (m) => args.onRoleChange?.(m),
        bulk: {
          done: "Role updated",
          skipReason: (m) =>
            m.role === "owner"
              ? "The owner changes through Transfer ownership"
              : refusal(m),
          confirm: (t) => ({
            title: `Set role for ${t.ids.length} member${t.ids.length === 1 ? "" : "s"}?`,
            description: "Each member gets the role you pick.",
            confirmLabel: "Set role",
            ask: {
              kind: "choice",
              label: "Role",
              options: MEMBER_BULK_ROLES.map((r) => ({
                value: r.value,
                label: r.label,
              })),
              defaultValue: "member",
            },
          }),
          runOne: async (_id, row, input) => {
            if (!row) throw new Error("Member not loaded");
            if (row.role === input.value) return;
            must(
              await updateMemberRole(
                organizationId,
                row.userId,
                input.value as OrgRole,
              ),
              "Could not change the role",
            );
          },
        },
      },
      {
        id: "remove",
        icon: UserX,
        label: "Remove",
        tone: "destructive",
        appliesTo: (m) => refusal(m) === null,
        unavailableTooltip: "Cannot be removed",
        onClick: (m) => args.onRemove?.(m),
        bulk: {
          done: "Removed",
          removesRows: true,
          skipReason: refusal,
          confirm: (t) => ({
            title: `Remove ${t.ids.length} member${t.ids.length === 1 ? "" : "s"}?`,
            description: `They lose access to everything shared in this organization. Any the server refuses are skipped and named.`,
            confirmLabel: "Remove",
            variant: "destructive",
          }),
          runOne: async (_id, row) => {
            if (!row) throw new Error("Member not loaded");
            must(
              await removeMember(organizationId, row.userId),
              "Could not remove the member",
            );
          },
        },
      },
    ],
    {
      noun: "member",
      getRowId: (m) => m.id,
      getRowName: memberName,
    },
  ).bulkActions;
}

/** Resend / Revoke for the org Invitations list. */
export function orgInvitationBulkActions(args: {
  organizationId: string;
  onResend?: (i: PanelInvitation) => void;
  onCancel?: (i: PanelInvitation) => void;
}): EntityBulkAction<PanelInvitation>[] {
  const { organizationId } = args;
  return defineRowVerbs<PanelInvitation>(
    [
      {
        id: "resend",
        icon: RefreshCw,
        label: "Resend",
        onClick: (i) => args.onResend?.(i),
        bulk: {
          done: "Resent",
          runOne: async (id, row) => {
            const result = await resendInvitation(id, {
              organizationId,
              email: row?.email ?? "",
            });
            must(result, "Could not resend");
            if ("emailSent" in result && result.emailSent === false) {
              throw new Error("Renewed, but the email could not be sent");
            }
          },
        },
      },
      {
        id: "revoke",
        icon: X,
        label: "Revoke",
        tone: "destructive",
        onClick: (i) => args.onCancel?.(i),
        bulk: {
          done: "Revoked",
          removesRows: true,
          confirm: (t) => ({
            title: `Revoke ${t.ids.length} invitation${t.ids.length === 1 ? "" : "s"}?`,
            description:
              "The invited people can no longer accept. Their links stop working.",
            confirmLabel: "Revoke",
            variant: "destructive",
          }),
          runOne: async (id) => {
            must(await cancelInvitation(id), "Could not revoke");
          },
        },
      },
    ],
    {
      noun: "invitation",
      getRowId: (i) => i.id,
      getRowName: (i) => i.email,
    },
  ).bulkActions;
}

/** Archive / Restore for the Teams list (owners and admins only reach this). */
export function teamBulkActions(args: {
  onArchive?: (t: Team) => void;
  onRestore?: (t: Team) => void;
}): EntityBulkAction<Team>[] {
  return defineRowVerbs<Team>(
    [
      {
        id: "archive",
        icon: Archive,
        label: "Archive",
        tone: "destructive",
        appliesTo: (t) => !t.archivedAt,
        unavailableTooltip: "Already archived",
        onClick: (t) => args.onArchive?.(t),
        bulk: {
          done: "Archived",
          confirm: (t) => ({
            title: `Archive ${t.ids.length} team${t.ids.length === 1 ? "" : "s"}?`,
            description:
              "They leave the team list and stop counting as teammates in lists set to show my team. Nothing is deleted and nobody loses access; restore brings them back with their members.",
            confirmLabel: "Archive",
            variant: "destructive",
          }),
          runOne: (id) => archiveTeam(id),
        },
      },
      {
        id: "restore",
        icon: ArchiveRestore,
        label: "Restore",
        appliesTo: (t) => Boolean(t.archivedAt),
        unavailableTooltip: "Not archived",
        onClick: (t) => args.onRestore?.(t),
        bulk: { done: "Restored", runOne: (id) => restoreTeam(id) },
      },
    ],
    { noun: "team", getRowId: (t) => t.id, getRowName: (t) => t.name },
  ).bulkActions;
}

/** Set role / Remove for the people on ONE team (rows are PanelMembers keyed by user id). */
export function teamMemberBulkActions(args: {
  teamId: string;
  teamName: string;
  byUser: Map<string, TeamMember>;
}): EntityBulkAction<PanelMember>[] {
  const { teamId, byUser } = args;
  return defineRowVerbs<PanelMember>(
    [
      {
        id: "set-role",
        icon: Shield,
        label: "Set role",
        onClick: () => {},
        bulk: {
          done: "Role updated",
          confirm: (t) => ({
            title: `Set team role for ${t.ids.length} ${t.ids.length === 1 ? "person" : "people"}?`,
            description: "Each gets the role you pick on this team.",
            confirmLabel: "Set role",
            ask: {
              kind: "choice",
              label: "Role",
              options: [
                { value: "admin", label: "Team admin" },
                { value: "member", label: "Member" },
              ],
              defaultValue: "member",
            },
          }),
          runOne: async (id, _row, input) => {
            await setTeamMemberRole(teamId, id, input.value as TeamRole);
          },
        },
      },
      {
        id: "remove",
        icon: UserX,
        label: "Remove",
        tone: "destructive",
        appliesTo: (m) => byUser.get(m.userId)?.isListed ?? false,
        unavailableTooltip: "On this team through HR; change it in HR",
        onClick: () => {},
        bulk: {
          done: "Removed",
          removesRows: true,
          confirm: (t) => ({
            title: `Remove ${t.ids.length} ${t.ids.length === 1 ? "person" : "people"} from ${args.teamName}?`,
            description:
              "They stay in the organization and keep everything they could open; lists just stop showing their work under My team for this team.",
            confirmLabel: "Remove",
            variant: "destructive",
          }),
          runOne: async (id) => {
            await removeTeamMember(teamId, id);
          },
        },
      },
    ],
    { noun: "person", getRowId: (m) => m.userId, getRowName: memberName },
  ).bulkActions;
}
