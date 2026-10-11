"use client";

import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@ai-matrx/design-system";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCodeInput } from "@/components/qr/QrCodeInput";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { parseEnrollmentInput, type ParsedEnrollment } from "../../authenticator-otpauth";
import type { AuthenticatorEntry } from "../../authenticator-types";
import { AuthenticatorCode } from "./AuthenticatorCode";

/** Preserve a human's name; replace only blank/catalog placeholder names. */
export function authenticatorName(current: string, parsed: ParsedEnrollment, defaultName = "Website login"): string {
  const name = current.trim();
  if (name && ![defaultName, "Website login", "Authenticator"].some((value) => value.toLowerCase() === name.toLowerCase())) return name;
  return parsed.issuer || parsed.account || name || "Authenticator";
}

/** The three entry points share intake, retry, and immediate owner code display. */
export function AuthenticatorSetupDialog({ open, onOpenChange, onEnroll, onDone, name = "" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnroll: (input: string, parsed: ParsedEnrollment) => Promise<AuthenticatorEntry>;
  onDone?: () => void | Promise<void>;
  name?: string;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="matrx-touch-targets sm:max-w-md">
      <DialogHeader><DialogTitle>Add authenticator</DialogTitle></DialogHeader>
      {open && <SetupContent name={name} onEnroll={onEnroll} onDone={async () => {
        await onDone?.();
        onOpenChange(false);
      }} />}
    </DialogContent>
  </Dialog>;
}

function SetupContent({ name, onEnroll, onDone }: {
  name: string;
  onEnroll: (input: string, parsed: ParsedEnrollment) => Promise<AuthenticatorEntry>;
  onDone: () => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<AuthenticatorEntry | null>(null);
  const running = useRef(false);
  const alive = useRef(true);
  // Ref callback fences late enrollment results when a sheet is dismissed.
  const rootRef = (node: HTMLDivElement | null) => { alive.current = node !== null; };
  const enroll = async (value: string) => {
    if (running.current || entry) return;
    running.current = true;
    setWorking(true);
    setError(null);
    try {
      const parsed = parseEnrollmentInput(value);
      const saved = await onEnroll(value.trim(), parsed);
      if (!alive.current) return;
      setEntry(saved);
      setInput("");
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "Could not save the authenticator. Try again.");
    } finally {
      running.current = false;
      if (alive.current) setWorking(false);
    }
  };

  return <div ref={rootRef} className="space-y-4">
    {entry ? <>
      <div className="flex items-center gap-2 text-sm"><Check className="size-4 text-primary" />Authenticator saved</div>
      <EntityRef token="credential_item" id={entry.credential_item_id} name={entry.display_name} />
      <AuthenticatorCode credentialItemId={entry.credential_item_id} enabled={entry.enabled} period={entry.period} />
      <p className="text-sm text-muted-foreground">Enter this code on the website to finish setup.</p>
      <Button type="button" variant="primary" className="w-full" onClick={() => void onDone()}>Done</Button>
    </> : <>
      {name && <p className="text-sm font-medium">{name}</p>}
      <QrCodeInput autoStartCamera disabled={working} onDecoded={(value) => { setInput(value); void enroll(value); }} onError={setError} hint="Scan, upload, drop, or paste a QR image." />
      <div className="space-y-2">
        <Label htmlFor="authenticator-setup-key">Or enter a setup key</Label>
        <Input id="authenticator-setup-key" type="password" value={input} onChange={(event) => { setInput(event.target.value); setError(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void enroll(input); } }} placeholder="Setup key or otpauth:// link" autoComplete="off" spellCheck={false} className="text-base" disabled={working} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="button" variant="primary" className="w-full" disabled={working || !input.trim()} onClick={() => void enroll(input)}>{working && <Loader2 className="size-4 animate-spin" />}{working ? "Saving authenticator…" : "Save authenticator"}</Button>
    </>}
  </div>;
}
