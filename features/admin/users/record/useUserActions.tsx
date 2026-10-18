"use client";

// THE per-person admin actions (users one-roof, lane B1, 2026-10-17). Extracted from the Accounts
// roster's inline handlers so the roster's Manage menu and the person's own record page
// (/administration/users/<id>) run the SAME code: sign-in links, onboarding flag, full MCP access,
// top-tier models, close / reopen, and the in-app message.
//
// Handlers take the person they act on (the roster acts on many rows; the record page on one) and
// report each change through `onPatched`, so the caller keeps its own copy current (the roster
// patches its row; the record page re-reads its overview). The two dialogs these actions need
// (close reason, message) come back as `dialogs` for the caller to render once.

import { useState, type ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { TextInputDialog } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { createClient } from "@/utils/supabase/client";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProTextarea } from "@/components/official/ProTextarea";
import { toast } from "@/lib/toast";
import { isJsonObject } from "@/types/json";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { setTopTierAccess } from "@/features/ai-models/topTierAccess";
import { sendDirectMessage } from "../service/coupons";
import { feedbackDmKey } from "../lib/userResearch";
import { invalidateAdminRoster } from "../adminRoster";

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
}

export type UserActionPatch = Partial<
  Pick<UserActionSubject, "banned" | "mcp_full_access" | "top_tier_models" | "onboarding_completed">
>;

export interface UseUserActionsOptions {
  /** A change the database accepted, for the caller's copy of this person. */
  onPatched?: (userId: string, patch: UserActionPatch) => void;
}

function whoOf(subject: Pick<UserActionSubject, "email" | "display_name" | "id">): string {
  return subject.email ?? subject.display_name ?? subject.id;
}

export function useUserActions({ onPatched }: UseUserActionsOptions = {}) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const myId = useAppSelector((state) => state.userAuth.id);
  const selectedOrganizationId = useAppSelector(selectOrganizationId);

  const [closeTarget, setCloseTarget] = useState<UserActionSubject | null>(null);
  const [closing, setClosing] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<UserActionSubject | null>(null);
  const [reopening, setReopening] = useState(false);
  const [signOutTarget, setSignOutTarget] = useState<UserActionSubject | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [messageTarget, setMessageTarget] = useState<UserActionSubject | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageSending, setMessageSending] = useState(false);

  const sendAuthLink = async (subject: UserActionSubject, type: "magiclink" | "recovery") => {
    const noun = type === "magiclink" ? "magic sign-in link" : "password reset link";
    const ok = await confirm({
      title: `Send ${noun}?`,
      description: `Email a ${noun} to ${subject.email}. This is a single-use link that lets them sign in / reset without their current password.`,
      confirmLabel: "Send",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/users/auth-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: subject.id, email: subject.email, type, send: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      toast.success(`Sent ${noun} to ${subject.email}`, {
        action: json.action_link
          ? { label: "Copy link", onClick: () => void copyText(json.action_link) }
          : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const patchAccount = async (subject: UserActionSubject, body: Record<string, boolean>) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: subject.id, ...body }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    invalidateAdminRoster();
  };

  const toggleOnboarding = async (subject: UserActionSubject) => {
    const next = !subject.onboarding_completed;
    try {
      await patchAccount(subject, { onboardingCompleted: next });
      onPatched?.(subject.id, { onboarding_completed: next });
      toast.success(next ? "Marked as onboarded" : "Marked as new");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const toggleMcpFullAccess = async (subject: UserActionSubject) => {
    const next = !subject.mcp_full_access;
    try {
      await patchAccount(subject, { mcpFullAccess: next });
      onPatched?.(subject.id, { mcp_full_access: next });
      toast.success(
        next
          ? `Granted full MCP access to ${subject.email ?? subject.id}`
          : `Revoked full MCP access from ${subject.email ?? subject.id}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  // Top-tier models (cost rating 6): off for everyone; a super admin turns one person on.
  // The RPC refuses anyone else and records who changed it and when.
  const toggleTopTierModels = async (subject: UserActionSubject) => {
    const next = !subject.top_tier_models;
    const who = subject.email ?? subject.id;
    if (next) {
      const ok = await confirm({
        title: "Allow top-tier models?",
        description: `${who} will be able to run Mythos, Fable, GPT-6 Astra and every -max model, billed at top-tier prices. Recorded under your name.`,
        confirmLabel: "Allow",
      });
      if (!ok) return;
    }
    try {
      await setTopTierAccess(subject.id, next);
      invalidateAdminRoster();
      onPatched?.(subject.id, { top_tier_models: next });
      toast.success(next ? `Top-tier models on for ${who}` : `Top-tier models off for ${who}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  // Closing an account is the only way to "delete" one: the person row is permanent.
  // iam.close_account / iam.reopen_account check the platform-admin seat themselves.
  /** Why a close / reopen cannot run for this person, or null when it can. */
  const closeBlockedReason = (subject: UserActionSubject): string | null => {
    if (subject.erased) return "This account was erased and cannot be reopened.";
    if (!subject.banned && subject.id === myId)
      return "You cannot close your own account here. Use your account settings.";
    return null;
  };

  /** Close and reopen both ask for the reason (recorded in the admin history). */
  const setAccountClosed = async (subject: UserActionSubject, close: boolean) => {
    const blocked = closeBlockedReason(subject);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    if (close) {
      setCloseTarget(subject);
      return;
    }
    setReopenTarget(subject);
  };

  const confirmReopen = async (reason: string) => {
    if (!reopenTarget) return;
    const who = whoOf(reopenTarget);
    setReopening(true);
    try {
      const { error } = await createClient()
        .schema("iam")
        .rpc("reopen_account", { p_user: reopenTarget.id, p_reason: reason.trim() });
      if (error) {
        toast.error(error.message);
        return;
      }
      invalidateAdminRoster();
      onPatched?.(reopenTarget.id, { banned: false });
      toast.success(`Reopened ${who}`);
      setReopenTarget(null);
    } finally {
      setReopening(false);
    }
  };

  const confirmClose = async (reason: string) => {
    if (!closeTarget) return;
    const who = whoOf(closeTarget);
    setClosing(true);
    try {
      const { error } = await createClient()
        .schema("iam")
        .rpc("close_account", { p_user: closeTarget.id, p_reason: reason.trim() });
      if (error) {
        toast.error(error.message);
        return;
      }
      invalidateAdminRoster();
      onPatched?.(closeTarget.id, { banned: true });
      toast.success(`Closed ${who}`);
      setCloseTarget(null);
    } finally {
      setClosing(false);
    }
  };

  /** Ends every sign-in this person has (iam.sign_out_everywhere); asks for the reason first. */
  const signOutEverywhere = (subject: UserActionSubject) => setSignOutTarget(subject);

  const confirmSignOut = async (reason: string) => {
    if (!signOutTarget) return;
    const who = whoOf(signOutTarget);
    setSigningOut(true);
    try {
      const { data, error } = await createClient()
        .schema("iam")
        .rpc("sign_out_everywhere", { p_user: signOutTarget.id, p_reason: reason.trim() });
      if (error) {
        toast.error(error.message);
        return;
      }
      const ended = isJsonObject(data) && typeof data.sessions === "number" ? data.sessions : null;
      toast.success(ended === null ? `Signed ${who} out everywhere` : `Ended ${ended} sign-in${ended === 1 ? "" : "s"} for ${who}`);
      setSignOutTarget(null);
    } finally {
      setSigningOut(false);
    }
  };

  const openMessage = (subject: UserActionSubject) => {
    setMessageTarget(subject);
    setMessageDraft("");
  };

  const sendMessage = async () => {
    if (!messageTarget || !messageDraft.trim() || !myId || messageSending) return;
    if (!selectedOrganizationId) {
      // The conversation route files the DM in the admitted organization and
      // refuses without one; say so here instead of sending a request that 400s.
      toast.error("Select an organization from the avatar menu, then try again.");
      return;
    }
    setMessageSending(true);
    try {
      await sendDirectMessage({
        userId: messageTarget.id,
        content: messageDraft,
        organizationId: selectedOrganizationId,
        replayKey: (conversationId, content) => feedbackDmKey(myId, conversationId, content),
      });
      toast.success(`Message sent to ${messageTarget.display_name ?? messageTarget.email}`, {
        action: { label: "Open thread", onClick: () => openFromNotice("/messages") },
      });
      setMessageTarget(null);
      setMessageDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setMessageSending(false);
    }
  };

  const dialogs: ReactNode = (
    <>
      <TextInputDialog
        open={closeTarget !== null}
        onOpenChange={(open) => {
          if (!open && !closing) setCloseTarget(null);
        }}
        title={`Close ${closeTarget ? whoOf(closeTarget) : "account"}?`}
        description="They can't sign in again (open sessions last up to an hour); API keys are revoked, schedules pause. Records stay; reopen any time."
        placeholder="Reason (recorded with the closure)"
        confirmLabel="Close account"
        busy={closing}
        onConfirm={confirmClose}
      />
      <TextInputDialog
        open={reopenTarget !== null}
        onOpenChange={(open) => {
          if (!open && !reopening) setReopenTarget(null);
        }}
        title={`Reopen ${reopenTarget ? whoOf(reopenTarget) : "account"}?`}
        description="They can sign in again; paused schedules and connections resume. Revoked API keys stay revoked."
        placeholder="Reason (recorded in the admin history)"
        confirmLabel="Reopen"
        busy={reopening}
        onConfirm={confirmReopen}
      />
      <TextInputDialog
        open={signOutTarget !== null}
        onOpenChange={(open) => {
          if (!open && !signingOut) setSignOutTarget(null);
        }}
        title={`Sign ${signOutTarget ? whoOf(signOutTarget) : "this person"} out everywhere?`}
        description="Ends every sign-in on every device; a page already open can work up to an hour. They can sign in again."
        placeholder="Reason (recorded in the admin history)"
        confirmLabel="Sign out everywhere"
        busy={signingOut}
        onConfirm={confirmSignOut}
      />
      <Dialog
        open={messageTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMessageTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              In-app message to {messageTarget?.display_name ?? messageTarget?.email}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Sends a direct message from you into the user&apos;s in-app inbox
            (the DM system). They see it in Messages.
          </p>
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
    sendAuthLink,
    toggleOnboarding,
    toggleMcpFullAccess,
    toggleTopTierModels,
    setAccountClosed,
    closeBlockedReason,
    signOutEverywhere,
    openMessage,
    /** The person the message dialog is open for (surface context). */
    messageTarget,
    messageDraft,
    dialogs,
  };
}
