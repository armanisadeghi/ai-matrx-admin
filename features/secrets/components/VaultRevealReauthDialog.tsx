"use client";

/**
 * Confirm-it's-you for a credential action outside the Vault workspace (the
 * secure-link sender). The Vault itself (`@ai-matrx/vault`) carries its own
 * identity gate; this is the one remaining host-side copy, used by
 * `features/sharing/secure/SecureLinkPanel.tsx`.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { Button, ErrorNotice } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza-modal/credenza";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

import {
  confirmVaultPasswordIdentity,
  getVaultExportActor,
  VaultIdentityConfirmationError,
  type VaultVerifiedExportActor,
} from "../vault-service";

export function VaultRevealReauthDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [actor, setActor] = useState<VaultVerifiedExportActor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const passwordInput = useRef<HTMLInputElement | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!open) return;
    const current = ++generation.current;
    void getVaultExportActor().then(
      (next) => {
        if (generation.current === current) setActor(next);
      },
      () => {
        if (generation.current === current)
          setError("Your account changed. Reload the Vault and try again.");
      },
    );
    return () => {
      generation.current += 1;
      if (passwordInput.current) passwordInput.current.value = "";
    };
  }, [open]);

  const close = () => {
    generation.current += 1;
    if (passwordInput.current) passwordInput.current.value = "";
    setActor(null);
    setError(null);
    onClose();
  };

  const confirm = async () => {
    const password = passwordInput.current?.value ?? "";
    if (passwordInput.current) passwordInput.current.value = "";
    if (!actor || !password) {
      setError("Enter your current Matrx password to confirm your identity.");
      return;
    }
    const current = generation.current;
    setRunning(true);
    setError(null);
    try {
      await confirmVaultPasswordIdentity(actor, password, getVaultExportActor);
      if (generation.current !== current) return;
      close();
      toast.success("Identity confirmed. Choose Show or Copy again.");
    } catch (cause) {
      if (generation.current !== current) return;
      const code =
        cause instanceof VaultIdentityConfirmationError ? cause.code : null;
      setError(
        code === "credentials_rejected"
          ? "That password was not accepted. Try your current Matrx password."
          : code === "context_changed"
            ? "Your account or organization changed. Reload the Vault and try again."
            : "Your identity could not be confirmed. Try signing in again.",
      );
    } finally {
      if (generation.current === current) setRunning(false);
    }
  };

  return (
    <Credenza
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <CredenzaContent className="md:max-w-md">
        <CredenzaHeader>
          <CredenzaTitle>Confirm your identity</CredenzaTitle>
        </CredenzaHeader>
        <CredenzaBody className="space-y-3 px-4 pb-6 md:px-0">
          <p className="flex gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            For security, showing or copying a Vault value needs a recent
            sign-in.
          </p>
          {actor && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="vault-reveal-email">Current account</Label>
                <Input id="vault-reveal-email" value={actor.email} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vault-reveal-password">
                  Current Matrx password
                </Label>
                <Input
                  ref={passwordInput}
                  id="vault-reveal-password"
                  type="password"
                  autoComplete="current-password"
                  disabled={running}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Connected-provider sign-in needs a separate confirmation method.
              </p>
            </>
          )}
          {error && (
            <ErrorNotice size="inline" className="text-sm" message={error} />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirm()}
              disabled={!actor || running}
            >
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm identity
            </Button>
          </div>
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  );
}
