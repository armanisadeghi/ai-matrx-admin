"use client";

// features/auth/phone/PhoneCodeForm.tsx
//
// Phone number → texted code → signed in. Two steps on one form; the server
// actions do the work (phoneAuthActions.ts) and success is a full-document
// navigation to the destination, like HardRedirectForm.

import { useState, useTransition, type FormEvent } from "react";
import { Button, Input } from "@ai-matrx/design-system/controls";
import { Label } from "@/components/ui/label";
import { getFingerprint } from "@/lib/services/fingerprint-service";
import { sendPhoneCode, verifyPhoneCode } from "./phoneAuthActions";

interface PhoneCodeFormProps {
  /** Prefill (e.g. the number a coupon was texted to). Always editable. */
  defaultPhone?: string | null;
  /** The destination this auth page carries (utils/auth/auth-destination.ts). */
  redirectTo: string | null;
  submitLabel: string;
}

export function PhoneCodeForm({ defaultPhone, redirectTo, submitLabel }: PhoneCodeFormProps) {
  const [phoneInput, setPhoneInput] = useState(defaultPhone ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendPhoneCode(phoneInput);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentTo(result.phone);
      setCode("");
      setNotice(`Code sent to ${result.phone}`);
    });
  };

  const onSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send();
  };

  const onVerify = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    startTransition(async () => {
      // No fingerprint means no guest promotion, never a failed sign-in.
      const guestFingerprint = await getFingerprint().catch(() => null);
      const result = await verifyPhoneCode({ phone: sentTo, code, redirectTo, guestFingerprint });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.hardRedirect);
    });
  };

  if (!sentTo) {
    return (
      <form onSubmit={onSend} className="space-y-4" data-testid="phone-auth-send">
        <div>
          <Label htmlFor="phone" className="block text-sm font-medium text-foreground">
            Phone number
          </Label>
          <div className="mt-1">
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="block w-full"
              placeholder="(949) 555-0123"
              data-lpignore="true"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Text me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="space-y-4" data-testid="phone-auth-verify">
      <div>
        <Label htmlFor="phone-code" className="block text-sm font-medium text-foreground">
          6-digit code
        </Label>
        <div className="mt-1">
          <Input
            id="phone-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="block w-full tracking-widest"
            placeholder="123456"
            data-lpignore="true"
          />
        </div>
        {notice && <p className="mt-1 text-xs text-muted-foreground">{notice}</p>}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Checking…" : submitLabel}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Button
          type="button"
          variant="quiet"
          disabled={pending}
          onClick={() => {
            setSentTo(null);
            setError(null);
            setNotice(null);
          }}
        >
          Change number
        </Button>
        <Button type="button" variant="quiet" disabled={pending} onClick={send}>
          Send a new code
        </Button>
      </div>
    </form>
  );
}
