"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCodeInput } from "@/components/qr/QrCodeInput";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { VaultRevealReauthDialog } from "../SecretValue";
import { BackendApiError, MatrxApiError } from "@ai-matrx/agents/matrx";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  parseEnrollmentInput,
  type ParsedEnrollment,
} from "../../authenticator-otpauth";
import type { AuthenticatorEntry } from "../../authenticator-types";
import { toast } from "@/lib/toast";
import { AuthenticatorCode } from "./AuthenticatorCode";

/** Preserve a human's name; replace only blank/catalog placeholder names. */
export function authenticatorName(
  current: string,
  parsed: ParsedEnrollment,
  defaultName = "Website login",
): string {
  const name = current.trim();
  if (
    name &&
    ![defaultName, "Website login", "Authenticator"].some(
      (value) => value.toLowerCase() === name.toLowerCase(),
    )
  )
    return name;
  return parsed.issuer || parsed.account || name || "Authenticator";
}

/** The three entry points share intake, retry, and immediate owner code display. */
export function AuthenticatorSetupDialog({
  open,
  onOpenChange,
  onEnroll,
  onDone,
  name = "",
  standalone = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnroll: (
    input: string,
    parsed: ParsedEnrollment,
    details: {
      displayName: string;
      loginUrl: string;
      organizationId: string;
      userId: string;
    },
  ) => Promise<AuthenticatorEntry>;
  onDone?: () => void | Promise<void>;
  name?: string;
  standalone?: boolean;
}) {
  const organizationId = useAppSelector(selectOrganizationId);
  const userId = useAppSelector(selectUserId);
  const saving = useRef(false);
  const completed = useRef(false);
  useEffect(() => {
    completed.current = false;
  }, [open, organizationId, userId]);
  const finish = async () => {
    await onDone?.();
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving.current) return;
        if (!next && completed.current) {
          void finish().catch((cause: unknown) =>
            toast.error("Authenticator saved. Could not finish closing.", {
              description:
                cause instanceof Error
                  ? cause.message
                  : "Choose Done to try again.",
            }),
          );
        } else onOpenChange(next);
      }}
    >
      <DialogContent className="matrx-touch-targets sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add authenticator</DialogTitle>
        </DialogHeader>
        {open && (
          <SetupContent
            key={`${userId}:${organizationId}`}
            name={name}
            standalone={standalone}
            organizationId={organizationId}
            userId={userId}
            onEnroll={async (input, parsed, details) => {
              saving.current = true;
              try {
                const saved = await onEnroll(input, parsed, details);
                completed.current = true;
                return saved;
              } finally {
                saving.current = false;
              }
            }}
            onDone={finish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SetupContent({
  name,
  standalone,
  organizationId,
  userId,
  onEnroll,
  onDone,
}: {
  name: string;
  standalone: boolean;
  organizationId: string | null;
  userId: string | null;
  onEnroll: (
    input: string,
    parsed: ParsedEnrollment,
    details: {
      displayName: string;
      loginUrl: string;
      organizationId: string;
      userId: string;
    },
  ) => Promise<AuthenticatorEntry>;
  onDone: () => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<AuthenticatorEntry | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const running = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const enroll = async (value: string) => {
    if (running.current || entry) return;
    running.current = true;
    setWorking(true);
    setError(null);
    try {
      if (!organizationId || !userId)
        throw new Error("Sign in before adding an authenticator.");
      const parsed = parseEnrollmentInput(value);
      const saved = await onEnroll(value.trim(), parsed, {
        displayName,
        loginUrl,
        organizationId,
        userId,
      });
      if (!alive.current) return;
      setEntry(saved);
      setInput("");
    } catch (cause) {
      if (
        alive.current &&
        ((cause instanceof BackendApiError &&
          ["recent_auth_required", "auth_required"].includes(cause.code)) ||
          (cause instanceof MatrxApiError && cause.status === 401))
      )
        setReauthOpen(true);
      if (alive.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not save the authenticator. Try again.",
        );
    } finally {
      running.current = false;
      if (alive.current) setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      {entry ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-primary" />
            Authenticator saved
          </div>
          <EntityRef
            token="credential_item"
            id={entry.credential_item_id}
            name={entry.display_name}
          />
          <AuthenticatorCode
            credentialItemId={entry.credential_item_id}
            enabled={entry.enabled}
            period={entry.period}
          />
          <p className="text-sm text-muted-foreground">
            Enter this code on the website to finish setup.
          </p>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <span className="min-w-0 flex-1">{error}</span>
              <ErrorAlchemyMenu error={error} />
            </div>
          )}
          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={() => {
              void onDone().catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not finish. Try again.",
                ),
              );
            }}
          >
            Done
          </Button>
        </>
      ) : (
        <>
          {name && <p className="text-sm font-medium">{name}</p>}
          {standalone && (
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Name and website (optional)
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="authenticator-name">Name</Label>
                <Input
                  id="authenticator-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Filled from the QR code"
                  disabled={working}
                />
                <Label htmlFor="authenticator-website">Website</Label>
                <Input
                  id="authenticator-website"
                  value={loginUrl}
                  onChange={(event) => setLoginUrl(event.target.value)}
                  placeholder="https://example.com"
                  disabled={working}
                  type="url"
                />
              </div>
            </details>
          )}
          <QrCodeInput
            autoStartCamera
            disabled={working}
            onDecoded={(value) => {
              setInput(value);
              void enroll(value);
            }}
            onError={setError}
            hint="Scan, upload, drop, or paste a QR image."
          />
          <div className="space-y-2">
            <Label htmlFor="authenticator-setup-key">
              Or enter a setup key
            </Label>
            <Input
              id="authenticator-setup-key"
              type="password"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void enroll(input);
                }
              }}
              placeholder="Setup key or otpauth:// link"
              autoComplete="off"
              spellCheck={false}
              className="text-base"
              disabled={working}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error} <ErrorAlchemyMenu error={error} />
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={working || !input.trim()}
            onClick={() => void enroll(input)}
          >
            {working && <Loader2 className="size-4 animate-spin" />}
            {working ? "Saving authenticator…" : "Save authenticator"}
          </Button>
        </>
      )}
      {reauthOpen && (
        <VaultRevealReauthDialog
          open={reauthOpen}
          onClose={() => {
            setReauthOpen(false);
          }}
        />
      )}
    </div>
  );
}
