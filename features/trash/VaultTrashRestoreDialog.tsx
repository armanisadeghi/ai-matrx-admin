"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { IdentityGate, useConfirmed, wasCancelled } from "@ai-matrx/vault";

import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza-modal/credenza";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useAppSelector } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";
import { webVaultIdentity } from "@/features/secrets/webVaultIdentity";
import {
  getVaultExportActor,
  restoreVaultItem,
  VaultRestoreTransportError,
  type VaultRestoreResult,
  type VaultVerifiedExportActor,
} from "@/features/secrets/vault-service";
import type { TrashItem, VaultRecoveryPreview } from "./service";
import { ErrorNotice } from "@ai-matrx/design-system";

function sameActor(
  left: VaultVerifiedExportActor,
  right: VaultVerifiedExportActor,
): boolean {
  return (
    left.userId === right.userId && left.organizationId === right.organizationId
  );
}

function refusalText(reason: string | null): string {
  if (reason === "recovery_tracking_unavailable") {
    return "This credential was deleted before recovery tracking began. Automatic recovery is unavailable, and its retained recovery data is preserved.";
  }
  if (reason === "recovery_manifest_unsupported") {
    return "This credential’s recovery manifest cannot be restored automatically yet. Its retained recovery data is preserved.";
  }
  if (reason === "protected_component_requires_native_recovery") {
    return "This credential contains protected material that cannot be restored automatically yet. Its retained recovery data is preserved.";
  }
  if (reason === "linked_component_requires_native_recovery") {
    return "This credential is linked to a provider or integration and cannot be restored automatically yet. Its retained recovery data is preserved.";
  }
  if (reason === "native_recovery_unavailable") {
    return "Native passkey recovery is temporarily unavailable. Reload Trash and try again; its retained recovery data is preserved.";
  }
  if (reason === "native_components_missing") {
    return "The passkey recovery components are no longer complete. This credential was not changed; reload Trash and review it again.";
  }
  if (reason === "native_components_conflict") {
    return "The passkey recovery components no longer match this credential. This credential was not changed; reload Trash and review it again.";
  }
  if (reason === "native_manifest_invalid") {
    return "This passkey recovery record is invalid. This credential was not changed; reload Trash and review it again.";
  }
  return "This credential cannot be recovered automatically. Its retained recovery data is preserved.";
}

/**
 * Restoring a credential needs a recent sign-in. It is confirmed through the vault's ONE
 * "Confirm it's you" (`IdentityGate` / `useConfirmed`), so a Google-only person can confirm and the
 * restore runs again by itself. There is no second dialog here.
 */
export function VaultTrashRestoreDialog(props: VaultTrashRestoreDialogProps) {
  return (
    <IdentityGate identity={webVaultIdentity}>
      <RestoreDialogBody {...props} />
    </IdentityGate>
  );
}

type VaultTrashRestoreDialogProps = {
  item: TrashItem | null;
  preview: VaultRecoveryPreview | null;
  actor: VaultVerifiedExportActor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: (item: TrashItem, result: VaultRestoreResult) => void;
};

function RestoreDialogBody({
  item,
  preview,
  actor,
  open,
  onOpenChange,
  onRestored,
}: VaultTrashRestoreDialogProps) {
  const confirmed = useConfirmed();
  const organizationId = useAppSelector(selectOrganizationId);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const expectedActor = useRef<VaultVerifiedExportActor | null>(actor);
  const [restoreActor, setRestoreActor] =
    useState<VaultVerifiedExportActor | null>(actor);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    generation.current += 1;
    controller.current?.abort();
    controller.current = null;
  };
  const clear = () => {
    cancel();
    expectedActor.current = null;
    setRestoreActor(null);
    setRunning(false);
    setError(null);
  };
  const close = () => {
    clear();
    onOpenChange(false);
  };
  const invalidate = (message: string) => {
    cancel();
    expectedActor.current = null;
    setRestoreActor(null);
    setRunning(false);
    setError(message);
  };
  const begin = () => {
    cancel();
    const operation = generation.current;
    const request = new AbortController();
    controller.current = request;
    return { operation, request };
  };
  const isCurrent = (operation: number) =>
    mounted.current && generation.current === operation;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const { data } = createClient().auth.onAuthStateChange(
      (_event, session) => {
        const actor = expectedActor.current;
        if (actor && (!session?.user || session.user.id !== actor.userId)) {
          invalidate(
            "Your account changed. Review this credential again before restoring it.",
          );
        }
      },
    );
    return () => data.subscription.unsubscribe();
  }, [open]);

  useEffect(() => {
    const actor = expectedActor.current;
    if (actor && actor.organizationId !== organizationId) {
      invalidate(
        "Your request organization changed. Review this credential again before restoring it.",
      );
    }
  }, [organizationId]);

  const restore = async () => {
    if (!item || !preview?.deletion_id) return;
    const { operation, request } = begin();
    setRunning(true);
    setError(null);
    try {
      const actor = expectedActor.current;
      if (!actor) {
        setError(
          "Your current account is still being verified. Try again in a moment.",
        );
        return;
      }
      if (!isCurrent(operation)) return;
      expectedActor.current = actor;
      // A "confirm it's you" refusal opens the gate; once confirmed the same restore runs again.
      const result = await confirmed(() =>
        restoreVaultItem(item.id, preview.deletion_id!, actor, request.signal),
      );
      const actual = await getVaultExportActor();
      if (
        !isCurrent(operation) ||
        request.signal.aborted ||
        !sameActor(actual, actor)
      ) {
        throw new VaultRestoreTransportError("context_changed");
      }
      onRestored(item, result);
      close();
    } catch (cause) {
      if (
        !isCurrent(operation) ||
        (cause instanceof DOMException && cause.name === "AbortError")
      )
        return;
      if (wasCancelled(cause)) {
        setError("Not restored: your identity was not confirmed.");
      } else if (cause instanceof VaultRestoreTransportError) {
        if (cause.code === "recent_auth_required") {
          setError(cause.message);
        } else if (cause.code === "context_changed") {
          invalidate(cause.message);
        } else {
          setError(cause.message);
        }
      } else {
        setError(
          "Recovery could not be completed. Retry this same recovery record.",
        );
      }
    } finally {
      if (controller.current === request) controller.current = null;
      if (isCurrent(operation)) setRunning(false);
    }
  };

  if (!item || !preview) return null;
  const supported = preview.supported && Boolean(preview.deletion_id);
  return (
    <Credenza
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <CredenzaContent className="md:max-w-lg">
        <CredenzaHeader>
          <CredenzaTitle>Restore credential</CredenzaTitle>
        </CredenzaHeader>
        <CredenzaBody className="space-y-4 px-4 pb-6 md:px-0">
          {supported ? (
            <section className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Restore{" "}
                <span className="font-medium text-foreground">
                  {item.title || "this credential"}
                </span>{" "}
                with {preview.native_passkeys_count === 1 && "1 passkey, "}
                {preview.fields_count} field
                {preview.fields_count === 1 ? "" : "s"} and{" "}
                {preview.attachments_count} attachment
                {preview.attachments_count === 1 ? "" : "s"}.
              </p>
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Recovery keeps this credential disabled. Restored fields stay
                  inactive; sharing, browser fill, authenticator use, sandbox
                  injection, agent and integration use stay off. Reenable each
                  capability deliberately after recovery.
                </p>
              </div>
              {preview.native_passkeys_count === 1 && (
                <p className="text-sm text-muted-foreground">
                  Restoring this passkey does not reenable it or confirm that
                  the website accepts it. Remove any website registration at
                  that website if you no longer want it there.
                </p>
              )}
              {preview.prior_was_disabled && (
                <p className="text-xs text-muted-foreground">
                  It was already disabled before deletion and will remain
                  disabled.
                </p>
              )}
              {error && (
                <ErrorNotice size="inline" className="text-sm" message={error} />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button
                  icon={running ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RotateCcw />
                  )}
                  variant="primary"
                  type="button"
                  onClick={() => void restore()}
                  disabled={running || !restoreActor}
                >
                  Restore disabled credential
                </Button>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{refusalText(preview.reason)}</p>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" type="button" onClick={close}>
                  Close
                </Button>
              </div>
            </section>
          )}
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  );
}
