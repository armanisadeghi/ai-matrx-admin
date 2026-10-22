/**
 * Bulk twins for the org-admin member roster (THE BULK TWIN RULE). Declared once
 * with defineRowVerbs; the single-member page keeps its own forms (they edit the
 * whole record). Server doors stay the authority and refusals are named per row.
 */
import { ShieldOff, ShieldCheck, Gauge, UserX } from "lucide-react";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { MatrxTableRowActionDef } from "@ai-matrx/design-system/data-table/types";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { pointsToUsd } from "@ai-matrx/kit/format";
import { getOrgMember, removeMember, setMemberControls, setMemberStatus } from "./service";
import { usdToMcents } from "./utils";
import type { OrgAdminMember } from "./types";

/** Cap choices from the knob's point amounts; "none" (clear the cap) is always first. */
export function capChoices(points: readonly string[]): { value: string; label: string }[] {
  return [
    { value: "none", label: "No limit" },
    ...points.map((p) => ({ value: p, label: `${Number(p).toLocaleString()} points` })),
  ];
}

/** Points choice -> stored millicents, through the same conversion the single-member form uses. */
export function capChoiceToMcents(
  choice: string,
  rate: number | null,
): number | null {
  if (choice === "none") return null;
  return usdToMcents(String(pointsToUsd(Number(choice), { rate }) ?? ""));
}

const name = (m: OrgAdminMember) => m.displayName ?? m.email ?? m.userId;

export function rosterVerbs(args: {
  orgId: string;
  rate: number | null;
  /** The knob's point amounts; null while unread or unreadable (the cap verb stays off). */
  capPoints: readonly string[] | null;
  capError?: string | null;
  /** The row's door for each verb: the member page, where its forms and dialogs live. */
  open: (member: OrgAdminMember) => void;
}): { rowActionDefs: MatrxTableRowActionDef<OrgAdminMember>[]; bulkActions: EntityBulkAction<OrgAdminMember>[] } {
  const { orgId, rate, capPoints, capError, open } = args;
  const none = open;
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
        disabled: () => capPoints === null,
        bulk: {
          done: "Spend cap set",
          skipReason: () => (capPoints === null ? (capError ?? "Loading the cap choices…") : null),
          confirm: (t) => ({
            title: `Set the monthly spend cap for ${t.ids.length} member${t.ids.length === 1 ? "" : "s"}?`,
            description:
              "Each member gets this monthly cap. Their tier, storage cap and notes stay as they are.",
            confirmLabel: "Set cap",
            ask: {
              kind: "choice",
              label: "Monthly cap",
              options: capChoices(capPoints ?? []),
              defaultValue: "none",
            },
          }),
          // Patch only the cap: re-read the member just now so a change made since the list
          // loaded (tier, storage cap, notes) is carried through, never overwritten by stale row data.
          runOne: async (id, _row, input) => {
            const fresh = await getOrgMember(orgId, id);
            await setMemberControls(orgId, id, {
              memberLevel: fresh.memberLevel,
              tierOverride: fresh.tierOverride,
              storageCapBytes: fresh.storageCapBytes,
              monthlyBudgetMcents: capChoiceToMcents(input.value ?? "none", rate),
              notes: fresh.notes,
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
  );
}
