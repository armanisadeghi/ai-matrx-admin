"use client";

import { useState } from "react";
import {
  Archive,
  Check,
  EyeOff,
  KeyRound,
  Loader2,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useAccessGate } from "@/features/access-gate/hooks/useAccessGate";
import {
  createAccessRequest,
  createDeleteRequest,
} from "@/features/access-gate/service/accessRequests";
import { ProTextarea } from "@/components/official/ProTextarea";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useHideForMe } from "@/features/access-gate/hooks/useHiddenByMe";

/**
 * THE screen for "you can see this, but removing it is not yours to do"
 * (platform primitive, 2026-10-14). Any record a person can view but may not
 * archive or delete opens this instead of a refusal: ask the owner/admins to
 * do it, ask for full access, or hide it for yourself (it leaves your lists and
 * waits in that list's Hidden view). Open it BEFORE trying the write when
 * `useRemovalRights` says `canRemove: false`, and after a governed refusal
 * (`isGovernedActionDenial`).
 */
type RequestChoice = "delete" | "hide" | "full";

export function GovernedActionDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  itemName,
  itemLabel = "site",
  href,
  action = "delete",
  onHidden,
  invalidateOnHide = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: string;
  resourceId: string;
  itemName: string;
  itemLabel?: string;
  href?: string | null;
  /** The word for the removal the person tried: "archive" or "delete". */
  action?: "archive" | "delete";
  /** Called after the person hid the item for themselves. */
  onHidden?: () => void;
  /** List query keys to re-read after a hide (the hidden ids refresh on their own). */
  invalidateOnHide?: readonly unknown[][];
}) {
  const currentUserId = useAppSelector(selectUserId);
  const { context, isLoading } = useAccessGate(resourceType, resourceId, {
    enabled: open,
  });
  const [choice, setChoice] = useState<RequestChoice>("delete");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<RequestChoice | null>(null);
  const { hide } = useHideForMe(resourceType, invalidateOnHide);
  const verb = action === "archive" ? "archive" : "delete";
  const ActionIcon = action === "archive" ? Archive : Trash2;

  const ownerName =
    context?.owner?.displayName ??
    (context?.organization ? context.organization.name : null) ??
    "the owner";

  async function hideIt() {
    setBusy(true);
    try {
      await hide.mutateAsync(resourceId);
      toast.success(`Hidden for you. Find ${itemName} under Hidden.`);
      onHidden?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "We couldn't hide that.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendRequest() {
    if (choice === "hide") return hideIt();
    setBusy(true);
    try {
      const result =
        choice === "delete"
          ? await createDeleteRequest({
              resourceType,
              resourceId,
              message: note,
              currentUserId,
              href,
            })
          : await createAccessRequest({
              resourceType,
              resourceId,
              level: "admin",
              message: note,
              currentUserId,
              href,
            });
      setSent(choice);
      if (result.blindAnswer) {
        toast.success(result.blindAnswer);
      } else if (result.already) {
        toast.success("Your request is already waiting for an answer.");
      } else if (result.delivered === 0) {
        toast.warning(
          "Your request is saved, but we couldn't message them just now.",
        );
      } else {
        toast.success(
          `Request sent to ${result.recipients[0]?.displayName ?? ownerName}.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't send that request.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="matrx-touch-targets sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <ActionIcon className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <DialogTitle>
            Only {ownerName} can {verb} this {itemLabel}
          </DialogTitle>
          <DialogDescription>
            You can work on{" "}
            <span className="font-medium text-foreground">{itemName}</span>, but
            removing it is up to them. Ask them, or hide it just for you.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Finding the person who can help…
          </div>
        ) : context?.status === "error" || context?.status === "anonymous" ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-ink">
            We couldn't find the right person to contact. Try again after
            refreshing.
            <ErrorAlchemyMenu />
          </div>
        ) : sent ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-primary" aria-hidden />
              {sent === "delete"
                ? action === "archive"
                  ? "Archive requested"
                  : "Deletion requested"
                : "Full access requested"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The request is saved in Access requests and sent to {ownerName} in
              Messages.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              <RequestChoiceButton
                active={choice === "delete"}
                icon={<ActionIcon className="h-4 w-4" aria-hidden />}
                title={`Ask them to ${verb} it`}
                detail="They approve it from your message."
                onClick={() => setChoice("delete")}
              />
              <RequestChoiceButton
                active={choice === "hide"}
                icon={<EyeOff className="h-4 w-4" aria-hidden />}
                title="Hide it for me"
                detail="Only you stop seeing it; undo under Hidden."
                onClick={() => setChoice("hide")}
              />
              <RequestChoiceButton
                active={choice === "full"}
                icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                title="Request full access"
                detail={`Then you can ${verb} it yourself.`}
                onClick={() => setChoice("full")}
              />
            </div>
            {choice === "hide" ? null : (
            <ProTextarea
              className="min-h-20 text-base md:text-sm"
              value={note}
              maxLength={500}
              placeholder="Add a note for the owner (optional)"
              onChange={(event) => setNote(event.target.value)}
            />
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sent ? "Done" : "Cancel"}
          </Button>
          {!sent &&
          context?.status !== "error" &&
          context?.status !== "anonymous" ? (
            <Button
              icon={busy ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : choice === "hide" ? (
                <EyeOff aria-hidden />
              ) : choice === "delete" ? (
                <Send aria-hidden />
              ) : (
                <KeyRound aria-hidden />
              )}
              variant="primary"
              disabled={busy || isLoading}
              onClick={() => void sendRequest()}
            >
              {choice === "hide" ? "Hide for me" : "Send request"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestChoiceButton({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}
