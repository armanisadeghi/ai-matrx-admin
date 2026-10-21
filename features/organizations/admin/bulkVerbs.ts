/**
 * Bulk twins for the org-admin member roster (THE BULK TWIN RULE). Declared once
 * with defineRowVerbs; the single-member page keeps its own forms (they edit the
 * whole record). Server doors stay the authority and refusals are named per row.
 */
import { ShieldOff, ShieldCheck, Gauge, UserX } from "lucide-react";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { pointsToUsd } from "@ai-matrx/kit/format";
import { removeMember, setMemberControls, setMemberStatus } from "./service";
import { usdToMcents } from "./utils";
import type { OrgAdminMember } from "./types";

/** Monthly spend-cap choices, in points (20,000 points = $1). "none" clears the cap. */
export const SPEND_CAP_CHOICES = [
  { value: "none", label: "No limit" },
  { value: "100000", label: "100,000 points" },
  { value: "500000", label: "500,000 points" },
  { value: "1000000", label: "1,000,000 points" },
  { value: "5000000", label: "5,000,000 points" },
] as const;

/** Points choice -> stored millicents, through the same conversion the single-member form uses. */
export function capChoiceToMcents(
  choice: string,
  rate: number | null,
): number | null {
  if (choice === "none") return null;
  return usdToMcents(String(pointsToUsd(Number(choice), { rate }) ?? ""));
}

const name = (m: OrgAdminMember) => m.displayName ?? m.email ?? m.userId;

export function rosterBulkActions(args: {
  orgId: string;
  rate: number | null;
}): EntityBulkAction<OrgAdminMember>[] {
  const { orgId, rate } = args;
  const none = () => {};
  return defineRowVerbs<OrgAdminMember>(
    [
      {
        id: "suspend",
        icon: ShieldOff,
        label: "Suspend",
        tone: "destructive",
        appliesTo: (m) => m.status !== "suspended",
        unavailableTooltip: "Already suspended",
        onClick: none,
        bulk: {
          done: "Suspended",
          confirm: (t) => ({
            title: `Suspend ${t.ids.length} member${t.ids.length === 1 ? "" : "s"}?`,
            description:
              "They stay in the organization but are blocked until reactivated. The reason goes in the admin history.",
            confirmLabel: "Suspend",
            variant: "destructive",
            reason: { placeholder: "Reason (recorded in the admin history)" },
          }),
          runOne: (id, _row, input) =>
            setMemberStatus(orgId, id, "suspended", input.reason),
        },
      },
      {
        id: "reactivate",
        icon: ShieldCheck,
        label: "Reactivate",
        appliesTo: (m) => m.status === "suspended",
        unavailableTooltip: "Not suspended",
        onClick: none,
        bulk: {
          done: "Reactivated",
          runOne: (id) => setMemberStatus(orgId, id, "active"),
        },
      },
      {
        id: "spend-cap",
        icon: Gauge,
        label: "Set spend cap",
        onClick: none,
        bulk: {
          done: "Spend cap set",
          confirm: (t) => ({
            title: `Set the monthly spend cap for ${t.ids.length} member${t.ids.length === 1 ? "" : "s"}?`,
            description:
              "Each member gets this monthly cap. Their tier, storage cap and notes stay as they are.",
            confirmLabel: "Set cap",
            ask: {
              kind: "choice",
              label: "Monthly cap",
              options: SPEND_CAP_CHOICES,
              defaultValue: "none",
            },
          }),
          runOne: (id, row, input) => {
            if (!row) throw new Error("Member not loaded");
            return setMemberControls(orgId, id, {
              memberLevel: row.memberLevel,
              tierOverride: row.tierOverride,
              storageCapBytes: row.storageCapBytes,
              monthlyBudgetMcents: capChoiceToMcents(input.value ?? "none", rate),
              notes: row.notes,
            });
          },
        },
      },
      {
        id: "remove",
        icon: UserX,
        label: "Remove",
        tone: "destructive",
        appliesTo: (m) => m.role !== "owner",
        unavailableTooltip: "The owner cannot be removed",
        onClick: none,
        bulk: {
          done: "Removed",
          removesRows: true,
          confirm: (t) => ({
            title: `Remove ${t.ids.length} member${t.ids.length === 1 ? "" : "s"} from the organization?`,
            description:
              "They lose access to everything shared here. Their own work keeps its owner. Any the server refuses are skipped and named.",
            confirmLabel: "Remove",
            variant: "destructive",
          }),
          runOne: async (id) => {
            await removeMember(orgId, id);
          },
        },
      },
    ],
    { noun: "member", getRowId: (m) => m.userId, getRowName: name },
  ).bulkActions;
}
