"use client";

// THE ONE DISPATCH for every admin action on a person (users one-roof; lane B1 2026-10-17, lane P
// 2026-10-18 — adversarial S2/B3/S1/B2/S5). The record page's header and Actions menu, its tabs
// (Billing, Support, Security) and the Accounts roster's Manage menu all call `run(id, person)`;
// none of them switches on an action id or holds an action dialog of its own (guard:
// __tests__/one-user-door-registry.test.ts). Labels and the "can't now, because…" rule come from
// the registry (userSurfaces.ts `userActionLabel` / `userActionBlocked`), so every menu agrees.
//
// Every state change asks a REASON (required) through the one reason prompt (`useReasonPrompt`,
// TextInputDialog) and sends it to the server door, which writes admin.admin_audit_log with it.
// After any accepted change `personChanged(id)` drops every held copy of the person (the roster,
// the peek's overview) and the caller's `onChanged` refreshes its own (the page bumps its version,
// so the open tab re-reads too; the roster patches its row).

import { useState, type ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { recordToast, toast } from "@/lib/toast";
import { isJsonObject } from "@/types/json";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { pushAppHref } from "@/lib/deployment/navigate";
import { setTopTierAccess } from "@/features/ai-models/topTierAccess";
import { setUserPlan } from "@/features/admin/limits/service";
import { ChangePlanDialog, type ChangePlanSubject } from "@/features/admin/limits/components/ChangePlanDialog";
import { SendTutorialDialog, type TutorialRecipient } from "@/features/guided-tutorials/admin/SendTutorialDialog";
import { GiveFreeMonthsDialog, type FreeMonthsPerson } from "../components/GiveFreeMonthsDialog";
import { StartSupportSessionDialog, type SupportSessionTarget } from "../support-sessions/StartSupportSessionDialog";
import { sendDirectMessage } from "../service/coupons";
import { feedbackDmKey } from "../lib/userResearch";
import { invalidateAdminRoster } from "../adminRoster";
import { forgetUserOverview } from "./userOverview";
import { useReasonPrompt } from "./useReasonPrompt";
import {
  userActionBlocked,
  userActionLabel,
  userEmailHref,
  type UserActionId,
} from "./userSurfaces";

/** What an action needs to know about the person it acts on. `AdminUserRow` satisfies it. */
export interface UserActionSubject {
  id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  /** Closed (cannot sign in). */
  banned: boolean;
  /** Erased — a closed account that can never reopen. */
  erased: boolean;
  admin_level: string | null;
  mcp_full_access: boolean;
  top_tier_models: boolean;
  onboarding_completed: boolean;
  /** The email address is verified. */
  email_confirmed: boolean;
  /** The person's current plan, for Change plan's starting choice; null/absent = unknown. */
  plan?: { key: string | null; source: string } | null;
}

export type UserActionPatch = Partial<
  Pick<UserActionSubject, "banned" | "mcp_full_access" | "top_tier_models" | "onboarding_completed" | "email_confirmed">
>;

/**
 * Every held copy of this person is now stale: the shared roster and the hover peek's overview
 * drop it (the next reader fetches fresh). Callers that hold their own copy refresh it themselves.
 */
export function personChanged(userId: string): void {
  invalidateAdminRoster();
  forgetUserOverview(userId);
}

// ── the one reason prompt ───────────────────────────────────────────────────────────────────

// ── the dispatch ────────────────────────────────────────────────────────────────────────────

export interface UseUserActionsOptions {
  /** A change the database accepted (after `personChanged`), for the caller's copy of this person. */
  onChanged?: (userId: string, patch: UserActionPatch) => void;
}

function whoOf(subject: Pick<UserActionSubject, "email" | "display_name" | "id" | "is_anonymous">): string {
  return subject.display_name ?? subject.email ?? (subject.is_anonymous ? "Guest" : subject.id);
}

/** The record a person-naming toast carries (lib/toast recordToast). */
function personRef(subject: Pick<UserActionSubject, "id" | "email" | "display_name" | "is_anonymous">) {
  return { type: "user", id: subject.id, title: whoOf(subject) };
}

async function rpcError(promise: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<unknown> {
  const { data, error } = await promise;
  // access-errors: ok — a write door's refusal, verbatim (the reason prompt shows it as a toast).
  if (error) throw new Error(error.message);
  return data;
}

/** The registry actions that change one person on a reason: one door per action, row and bulk alike. */
export type ReasonDoorId =
  | "magic_link"
  | "password_reset"
  | "mcp_access"
  | "top_tier"
  | "onboarded"
  | "verify_email"
  | "close"
  | "reopen"
  | "sign_out_everywhere"
  | "default_plan";

async function patchAccount(subject: Pick<UserActionSubject, "id">, body: Record<string, boolean | string>) {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: subject.id, ...body }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
}

/** What a reason door answers, for the row's own toast. */
export interface ReasonDoorOutcome {
  /** A magic / recovery link the server minted (also emailed). */
  actionLink?: string | null;
  /** The door found nothing to change (already verified, was not closed). */
  unchanged?: boolean;
  /** Sign-ins ended. */
  sessions?: number | null;
}

/**
 * THE door for every reason-based change on a person. The row menu calls it with the reason it
 * asked; the bulk twin calls the SAME function once per selected person with the one reason. A
 * toggle takes `on` (the bulk twin names the direction; the row flips the person's current state).
 * Throws the server's own refusal sentence. Does not toast and does not refresh — callers do.
 */
export async function runReasonDoor(
  id: ReasonDoorId,
  subject: UserActionSubject,
  reason: string,
  options: { on?: boolean } = {},
): Promise<ReasonDoorOutcome> {
  switch (id) {
    case "magic_link":
    case "password_reset": {
      const res = await fetch("/api/admin/users/auth-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: subject.id,
          email: subject.email,
          type: id === "magic_link" ? "magiclink" : "recovery",
          send: true,
          reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to send");
      return { actionLink: json.action_link ?? null };
    }
    case "mcp_access":
      await patchAccount(subject, { mcpFullAccess: options.on ?? !subject.mcp_full_access, reason });
      return {};
    case "onboarded":
      await patchAccount(subject, { onboardingCompleted: options.on ?? !subject.onboarding_completed, reason });
      return {};
    case "top_tier":
      await setTopTierAccess(subject.id, options.on ?? !subject.top_tier_models, reason);
      return {};
    case "close":
      await rpcError(createClient().schema("iam").rpc("close_account", { p_user: subject.id, p_reason: reason }));
      return {};
    case "reopen": {
      const data = await rpcError(createClient().schema("iam").rpc("reopen_account", { p_user: subject.id, p_reason: reason }));
      // iam.reopen_account answers `reopened: false` when nothing was closed (B2).
      return { unchanged: isJsonObject(data) && data.reopened === false };
    }
    case "sign_out_everywhere": {
      const data = await rpcError(createClient().schema("iam").rpc("sign_out_everywhere", { p_user: subject.id, p_reason: reason }));
      return { sessions: isJsonObject(data) && typeof data.sessions === "number" ? data.sessions : null };
    }
    case "verify_email": {
      const data = await rpcError(createClient().schema("iam").rpc("admin_confirm_email", { p_user: subject.id, p_reason: reason }));
      return { unchanged: isJsonObject(data) && data.changed === false };
    }
    case "default_plan":
      await setUserPlan({ userId: subject.id, planKey: null, note: reason, expiresAt: null });
      return {};
  }
}

export function useUserActions({ onChanged }: UseUserActionsOptions = {}) {
  const router = useRouter();
  const { copyText } = useClipboard({ notify: copyNotify });
  const myId = useAppSelector((state) => state.userAuth.id);
  const selectedOrganizationId = useAppSelector(selectOrganizationId);
  const { askReason, reasonDialog } = useReasonPrompt();

  const [planTarget, setPlanTarget] = useState<ChangePlanSubject | null>(null);
  const [freeMonthsPeople, setFreeMonthsPeople] = useState<FreeMonthsPerson[] | null>(null);
  const [supportTarget, setSupportTarget] = useState<SupportSessionTarget | null>(null);
  const [tutorialPerson, setTutorialPerson] = useState<TutorialRecipient | null>(null);
  const [messageTarget, setMessageTarget] = useState<UserActionSubject | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageSending, setMessageSending] = useState(false);

  const changed = (userId: string, patch: UserActionPatch = {}) => {
    personChanged(userId);
    onChanged?.(userId, patch);
  };

  const sendAuthLink = (subject: UserActionSubject, type: "magiclink" | "recovery") => {
    const noun = type === "magiclink" ? "magic sign-in link" : "password reset link";
    askReason({
      title: `Send a ${noun} to ${whoOf(subject)}?`,
      description: `Single-use link, emailed to ${subject.email}.`,
      confirmLabel: "Send",
      run: async (reason) => {
        const json = await runReasonDoor(type === "magiclink" ? "magic_link" : "password_reset", subject, reason);
        changed(subject.id);
        recordToast.success(personRef(subject), `Sent ${noun} to ${subject.email}`, {
          action: json.actionLink ? { label: "Copy link", onClick: () => void copyText(json.actionLink as string) } : undefined,
        });
      },
    });
  };

  const toggleOnboarding = (subject: UserActionSubject) => {
    const next = !subject.onboarding_completed;
    askReason({
      title: next ? `Mark ${whoOf(subject)} as onboarded?` : `Mark ${whoOf(subject)} as new?`,
      description: next ? "Onboarding is skipped on their next visit." : "Onboarding shows again on their next visit.",
      confirmLabel: next ? "Mark onboarded" : "Mark as new",
      run: async (reason) => {
        await runReasonDoor("onboarded", subject, reason, { on: next });
        changed(subject.id, { onboarding_completed: next });
        recordToast.success(personRef(subject), next ? "Marked as onboarded" : "Marked as new");
      },
    });
  };

  const toggleMcpFullAccess = (subject: UserActionSubject) => {
    const next = !subject.mcp_full_access;
    askReason({
      title: next ? `Grant full MCP access to ${whoOf(subject)}?` : `Revoke full MCP access from ${whoOf(subject)}?`,
      description: next ? "Every MCP tool opens to them, not only the default set." : "They keep only the default MCP tools.",
      confirmLabel: next ? "Grant" : "Revoke",
      run: async (reason) => {
        await runReasonDoor("mcp_access", subject, reason, { on: next });
        changed(subject.id, { mcp_full_access: next });
        recordToast.success(personRef(subject), next ? `Granted full MCP access to ${whoOf(subject)}` : `Revoked full MCP access from ${whoOf(subject)}`);
      },
    });
  };

  // Top-tier models (cost rating 6): off for everyone; a super admin turns one person on.
  const toggleTopTierModels = (subject: UserActionSubject) => {
    const next = !subject.top_tier_models;
    const who = whoOf(subject);
    askReason({
      title: next ? `Allow top-tier models for ${who}?` : `Turn off top-tier models for ${who}?`,
      description: next ? `${who} can run top-tier models at top-tier prices.` : "Top-tier models are refused for them again.",
      confirmLabel: next ? "Allow" : "Turn off",
      run: async (reason) => {
        await runReasonDoor("top_tier", subject, reason, { on: next });
        changed(subject.id, { top_tier_models: next });
        recordToast.success(personRef(subject), next ? `Top-tier models on for ${who}` : `Top-tier models off for ${who}`);
      },
    });
  };

  // Closing an account is the only way to "delete" one: the person row is permanent.
  // iam.close_account / iam.reopen_account check the platform-admin seat themselves.
  const closeAccount = (subject: UserActionSubject) => {
    const who = whoOf(subject);
    askReason({
      title: `Close ${who}?`,
      description: "They can't sign in; API keys are revoked, records stay.",
      confirmLabel: "Close account",
      run: async (reason) => {
        await runReasonDoor("close", subject, reason);
        changed(subject.id, { banned: true });
        recordToast.success(personRef(subject), `Closed ${who}`);
      },
    });
  };

  const reopenAccount = (subject: UserActionSubject) => {
    const who = whoOf(subject);
    askReason({
      title: `Reopen ${who}?`,
      description: "They can sign in again; revoked API keys stay revoked.",
      confirmLabel: "Reopen",
      run: async (reason) => {
        const outcome = await runReasonDoor("reopen", subject, reason);
        // iam.reopen_account answers `reopened: false` when nothing was closed (B2): say so.
        if (outcome.unchanged) {
          changed(subject.id);
          recordToast.warning(personRef(subject), `${who} was not closed`);
          return;
        }
        changed(subject.id, { banned: false });
        recordToast.success(personRef(subject), `Reopened ${who}`);
      },
    });
  };

  const signOutEverywhere = (subject: UserActionSubject) => {
    const who = whoOf(subject);
    askReason({
      title: `Sign ${who} out everywhere?`,
      description: "Every device signs out within an hour.",
      confirmLabel: "Sign out everywhere",
      run: async (reason) => {
        const ended = (await runReasonDoor("sign_out_everywhere", subject, reason)).sessions ?? null;
        changed(subject.id);
        recordToast.success(personRef(subject), ended === null ? `Signed ${who} out everywhere` : `Ended ${ended} sign-in${ended === 1 ? "" : "s"} for ${who}`);
      },
    });
  };

  const verifyEmail = (subject: UserActionSubject) => {
    const who = whoOf(subject);
    askReason({
      title: `Mark ${who}'s email verified?`,
      description: `${subject.email} counts as verified; no confirmation email is sent.`,
      confirmLabel: "Mark verified",
      run: async (reason) => {
        const outcome = await runReasonDoor("verify_email", subject, reason);
        changed(subject.id, { email_confirmed: true });
        const already = outcome.unchanged === true;
        recordToast.success(personRef(subject), already ? `${who} was already verified` : `Marked ${who}'s email verified`);
      },
    });
  };

  const sendMessage = async () => {
    if (!messageTarget || !messageDraft.trim() || !myId || messageSending) return;
    if (!selectedOrganizationId) {
      // The conversation route files the DM in the admitted organization and
      // refuses without one; say so here instead of sending a request that 400s.
      toast.error("Create an organization first.");
      return;
    }
    setMessageSending(true);
    try {
      const { auditError } = await sendDirectMessage({
        userId: messageTarget.id,
        content: messageDraft,
        organizationId: selectedOrganizationId,
        replayKey: (conversationId, content) => feedbackDmKey(myId, conversationId, content),
      });
      recordToast.success(personRef(messageTarget), `Message sent to ${whoOf(messageTarget)}`, {
        action: { label: "Open thread", onClick: () => openFromNotice("/messages") },
      });
      if (auditError) toast.warning(`Sent, but not recorded in the admin history: ${auditError}`);
      changed(messageTarget.id);
      setMessageTarget(null);
      setMessageDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setMessageSending(false);
    }
  };

  /** Why `id` can't run for this person now, or null when it can (the registry's rule). */
  const blockedReason = (id: UserActionId, subject: UserActionSubject): string | null =>
    userActionBlocked(id, subject, { myId });

  /** The label `id` shows for this person, or null to leave it out (the registry's rule). */
  const labelFor = (id: UserActionId, subject: UserActionSubject): string | null => userActionLabel(id, subject);

  /** THE dispatch: run one registered action on one person. Refuses a blocked one with its reason. */
  const run = (id: UserActionId, subject: UserActionSubject) => {
    const blocked = blockedReason(id, subject);
    if (blocked) {
      recordToast.warning(personRef(subject), `${whoOf(subject)}: ${blocked}`);
      return;
    }
    const label = whoOf(subject);
    switch (id) {
      case "support_session":
        setSupportTarget({ id: subject.id, email: subject.email, displayName: subject.display_name });
        return;
      case "message":
        setMessageTarget(subject);
        setMessageDraft("");
        return;
      case "email":
        pushAppHref(router, userEmailHref(subject.id));
        return;
      case "magic_link":
        sendAuthLink(subject, "magiclink");
        return;
      case "password_reset":
        sendAuthLink(subject, "recovery");
        return;
      case "change_plan":
        setPlanTarget({
          kind: "user",
          id: subject.id,
          name: label,
          currentPlanKey: subject.plan?.key ?? null,
          grantActive: subject.plan?.source === "grant",
        });
        return;
      case "free_months":
        setFreeMonthsPeople([{ id: subject.id, label }]);
        return;
      case "tutorial":
        setTutorialPerson({ id: subject.id, label, email: subject.email });
        return;
      case "mcp_access":
        toggleMcpFullAccess(subject);
        return;
      case "top_tier":
        toggleTopTierModels(subject);
        return;
      case "onboarded":
        toggleOnboarding(subject);
        return;
      case "verify_email":
        verifyEmail(subject);
        return;
      case "close":
        closeAccount(subject);
        return;
      case "reopen":
        reopenAccount(subject);
        return;
      case "sign_out_everywhere":
        signOutEverywhere(subject);
        return;
    }
  };

  const dialogs: ReactNode = (
    <>
      {reasonDialog}
      <StartSupportSessionDialog
        target={supportTarget}
        onClose={() => {
          const id = supportTarget?.id;
          setSupportTarget(null);
          // A session may have started: the attention row and the Support tab read fresh.
          if (id) changed(id);
        }}
      />
      <ChangePlanDialog
        subject={planTarget}
        onClose={() => setPlanTarget(null)}
        onChanged={() => planTarget && changed(planTarget.id)}
      />
      <GiveFreeMonthsDialog
        open={freeMonthsPeople !== null}
        people={freeMonthsPeople ?? []}
        onClose={() => setFreeMonthsPeople(null)}
        onApplied={() => (freeMonthsPeople ?? []).forEach((p) => changed(p.id))}
      />
      <SendTutorialDialog person={tutorialPerson} onClose={() => setTutorialPerson(null)} />
      <Dialog
        open={messageTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMessageTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>In-app message to {messageTarget ? whoOf(messageTarget) : ""}</DialogTitle>
          </DialogHeader>
          <ProTextarea
            data-surface-value="dm_draft"
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder="Write your message…"
            rows={5}
            className="resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="quiet" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={<MessageSquare />}
              variant="primary"
              onClick={() => void sendMessage()}
              disabled={messageSending || !messageDraft.trim()}
            >
              {messageSending ? "Sending…" : "Send message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return {
    myId,
    run,
    labelFor,
    blockedReason,
    /** The one reason prompt (for a tab's own state change, e.g. a membership). */
    askReason,
    /** Give free months to several people at once (the roster's bulk action) — the same dialog. */
    giveFreeMonths: (people: FreeMonthsPerson[]) => setFreeMonthsPeople(people),
    /** The person the message dialog is open for (surface context). */
    messageTarget,
    messageDraft,
    dialogs,
  };
}

export type UserActions = ReturnType<typeof useUserActions>;
