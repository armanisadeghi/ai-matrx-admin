// THE bulk decision for every verb in the people registry (`USER_ACTIONS`), so the Accounts roster's
// bar is generated from the same list as its row menu (`bulkActionsFromRowVerbs(allUserActions(), …)`).
// A verb added to the registry without a decision here fails the type check. Every twin calls the
// SAME door the row menu does (`runReasonDoor`, `applyFreeMonths`…) once per person; the registry's
// own refusal (`userActionBlocked`) and each verb's already-in-that-state rule skip and name a row.

import { runReasonDoor, type ReasonDoorId } from "../record/useUserActions";
import { personChanged, type UserActionSubject } from "../record/useUserActions";
import type { UserActionId } from "../record/userSurfaces";
import { toast } from "@/lib/toast";
import type { BulkTwin, RegistryTwin } from "@/lib/entity-list/rowVerbs";

export type AccountRow = UserActionSubject;


const peopleLabel = (count: number) => (count === 1 ? "1 person" : `${count} people`);

/** A verb that emails each person: confirm names how many get an email. */
function outreach(id: ReasonDoorId, noun: string, done: string): BulkTwin<AccountRow> {
  return {
    done,
    confirm: (targets) => ({
      title: `Send ${noun} to ${peopleLabel(targets.ids.length)}?`,
      description: `${peopleLabel(targets.ids.length)} will get an email now. Each link is single-use.`,
      confirmLabel: "Send",
      reason: { placeholder: "Reason (recorded with each send)" },
    }),
    runOne: async (_id, row, input) => {
      if (!row) throw new Error("Not loaded");
      if (!input.reason) throw new Error("A reason is required.");
      await runReasonDoor(id, row, input.reason);
      personChanged(row.id);
    },
  };
}

/** A verb that turns one setting on or off for everyone selected. */
function flip(
  id: ReasonDoorId,
  label: string,
  current: (row: AccountRow) => boolean,
  options: { on: string; off: string; done: string },
): BulkTwin<AccountRow> {
  return {
    label,
    done: options.done,
    confirm: (targets) => ({
      title: `${label} for ${peopleLabel(targets.ids.length)}?`,
      description: "Each person gets the choice you make here; anyone already there is skipped.",
      confirmLabel: "Apply",
      ask: {
        kind: "choice",
        label: "Set to",
        options: [
          { value: "on", label: options.on },
          { value: "off", label: options.off },
        ],
        defaultValue: "on",
      },
      reason: { placeholder: "Reason (recorded with each change)" },
    }),
    runOne: async (_id, row, input) => {
      if (!row) throw new Error("Not loaded");
      const on = input.value !== "off";
      if (current(row) === on) throw new Error(on ? "Already on" : "Already off");
      if (!input.reason) throw new Error("A reason is required.");
      await runReasonDoor(id, row, input.reason, { on });
      personChanged(row.id);
    },
  };
}

/** The twin for every registry id. `giveFreeMonths` opens the roster's own dialog (it resolves nothing). */
export function accountBulkTwins(deps: {
  giveFreeMonths: (people: { id: string; label: string }[]) => void;
}): { [K in UserActionId]: RegistryTwin<AccountRow> } {
  return {
    support_session: { noBulk: "single" },
    message: { noBulk: "single" },
    email: { noBulk: "open" },
    magic_link: outreach("magic_link", "a magic sign-in link", "Sent a magic link to"),
    password_reset: outreach("password_reset", "a password reset link", "Sent a password reset to"),
    change_plan: {
      label: "Back to default plan",
      done: "Moved to the default plan",
      skipReason: (row) => (row.plan?.source === "grant" ? null : "Already on the default plan"),
      confirm: (targets) => ({
        title: `Move ${peopleLabel(targets.ids.length)} back to the default plan?`,
        description: "Any granted plan ends now. Use Give free months to grant a dated plan.",
        confirmLabel: "Move to default",
        reason: { placeholder: "Reason (recorded with each change)" },
      }),
      runOne: async (_id, row, input) => {
        if (!row) throw new Error("Not loaded");
        if (!input.reason) throw new Error("A reason is required.");
        await runReasonDoor("default_plan", row, input.reason);
        personChanged(row.id);
      },
    },
    free_months: {
      run: async (targets) => {
        // The dialog applies the plan itself and resolves nothing: the selection stays.
        // Ticked people whose rows are not loaded cannot be opened in it: say so, never drop them quietly.
        const notLoaded = targets.ids.length - targets.rows.length;
        if (notLoaded > 0) {
          toast.warning(
            `${peopleLabel(notLoaded)} ${notLoaded === 1 ? "is" : "are"} not loaded and left out of Give free months. Load them, then give again.`,
          );
        }
        if (targets.rows.length === 0) throw new Error("None of the selected people are loaded.");
        deps.giveFreeMonths(
          targets.rows.map((row) => ({ id: row.id, label: row.display_name ?? row.email ?? row.id })),
        );
        return undefined;
      },
    },
    tutorial: { noBulk: "single" },
    mcp_access: flip("mcp_access", "Full MCP access", (r) => r.mcp_full_access, {
      on: "Grant full MCP access",
      off: "Revoke full MCP access",
      done: "Updated MCP access for",
    }),
    top_tier: flip("top_tier", "Top-tier models", (r) => r.top_tier_models, {
      on: "Allow top-tier models",
      off: "Turn off top-tier models",
      done: "Updated top-tier models for",
    }),
    verify_email: {
      label: "Mark email verified",
      done: "Marked verified",
      skipReason: (row) => (row.email_confirmed ? "Already verified" : null),
      confirm: (targets) => ({
        title: `Mark ${peopleLabel(targets.ids.length)} verified?`,
        description: "Each email counts as verified; no confirmation email is sent.",
        confirmLabel: "Mark verified",
        reason: { placeholder: "Reason (recorded with each change)" },
      }),
      runOne: async (_id, row, input) => {
        if (!row) throw new Error("Not loaded");
        if (!input.reason) throw new Error("A reason is required.");
        await runReasonDoor("verify_email", row, input.reason);
        personChanged(row.id);
      },
    },
    onboarded: flip("onboarded", "Onboarding", (r) => r.onboarding_completed, {
      on: "Mark as onboarded",
      off: "Mark as new",
      done: "Updated onboarding for",
    }),
    sign_out_everywhere: {
      done: "Signed out",
      confirm: (targets) => ({
        title: `Sign ${peopleLabel(targets.ids.length)} out everywhere?`,
        description: "Every device for each person signs out within an hour.",
        confirmLabel: "Sign out everywhere",
        variant: "destructive",
        reason: { placeholder: "Reason (recorded with each sign-out)" },
      }),
      runOne: async (_id, row, input) => {
        if (!row) throw new Error("Not loaded");
        if (!input.reason) throw new Error("A reason is required.");
        await runReasonDoor("sign_out_everywhere", row, input.reason);
        personChanged(row.id);
      },
    },
    close: {
      label: "Close",
      done: "Closed",
      skipReason: (row) => (row.banned ? "Already closed" : null),
      confirm: (targets) => ({
        title: `Close ${targets.ids.length} account${targets.ids.length === 1 ? "" : "s"}?`,
        description: `${peopleLabel(targets.ids.length)} can't sign in again (open sessions last up to an hour); API keys are revoked, schedules pause. Records stay; reopen any time.`,
        confirmLabel: "Close accounts",
        variant: "destructive",
        reason: { placeholder: "Reason (recorded with each closure)" },
      }),
      runOne: async (_id, row, input) => {
        if (!row) throw new Error("Not loaded");
        if (!input.reason) throw new Error("A reason is required to close accounts.");
        await runReasonDoor("close", row, input.reason);
        personChanged(row.id);
      },
    },
    reopen: {
      label: "Reopen",
      done: "Reopened",
      skipReason: (row) => (row.erased ? "Erased — cannot be reopened" : !row.banned ? "Already open" : null),
      confirm: (targets) => ({
        title: `Reopen ${targets.ids.length} account${targets.ids.length === 1 ? "" : "s"}?`,
        description: `${peopleLabel(targets.ids.length)} can sign in again; paused schedules and connections resume. Revoked API keys stay revoked.`,
        confirmLabel: "Reopen",
        reason: { placeholder: "Reason (recorded in the admin history)" },
      }),
      runOne: async (_id, row, input) => {
        if (!row) throw new Error("Not loaded");
        if (!input.reason) throw new Error("A reason is required to reopen accounts.");
        const outcome = await runReasonDoor("reopen", row, input.reason);
        if (outcome.unchanged) throw new Error("Already open");
        personChanged(row.id);
      },
    },
  };
}
