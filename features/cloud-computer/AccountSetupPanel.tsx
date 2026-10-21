"use client";

/**
 * AccountSetupPanel — "Set up an account", run by the person on their own cloud
 * desktop. Opens the service's sign-up page on a profile kept for that account;
 * the person types and clicks everything in the desktop. When they are done,
 * one save puts the new login in their Vault (a website login bound to that
 * profile) and then offers to keep the account's authenticator key, so agents
 * can sign in later without asking. What they type here goes straight to the
 * vault — never to an agent.
 */

import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { BackendApiError } from "@ai-matrx/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import {
  saveAccountAuthenticator,
  saveAccountLogin,
  startAccountSetup,
  type AccountSetupRun,
  type SavedAccountLogin,
} from "./service";

type Step = "closed" | "address" | "typing" | "key" | "done";

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export function AccountSetupPanel() {
  const [step, setStep] = useState<Step>("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceUrl, setServiceUrl] = useState("");
  const [setup, setSetup] = useState<AccountSetupRun | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState<SavedAccountLogin | null>(null);
  const [key, setKey] = useState("");
  const [keyNeedsPassword, setKeyNeedsPassword] = useState(false);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const url = /^https?:\/\//i.test(serviceUrl.trim()) ? serviceUrl.trim() : `https://${serviceUrl.trim()}`;
      const started = await startAccountSetup({ serviceUrl: url });
      setSetup(started);
      setDisplayName(started.host);
      setStep("typing");
    } catch (cause) {
      setError(message(cause, "The sign-up page could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!setup) return;
    setBusy(true);
    setError(null);
    try {
      const result = await saveAccountLogin({ runId: setup.runId, displayName, username, password });
      setPassword("");
      setSaved(result);
      setStep("key");
      toast.success("Saved to your vault.");
    } catch (cause) {
      setError(message(cause, "The login could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function saveKey() {
    if (!saved) return;
    setBusy(true);
    setError(null);
    try {
      await saveAccountAuthenticator({ credentialItemId: saved.credentialItemId, key });
      setKey("");
      setStep("done");
      toast.success("Authenticator saved.");
    } catch (cause) {
      // The vault asks for a fresh sign-in before it stores a seed.
      const refused = cause instanceof BackendApiError && cause.status === 403;
      setKeyNeedsPassword(refused);
      setError(message(cause, "The authenticator could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("closed");
    setError(null);
    setServiceUrl("");
    setSetup(null);
    setUsername("");
    setPassword("");
    setSaved(null);
    setKey("");
    setKeyNeedsPassword(false);
  }

  if (step === "closed") {
    return (
      <Button variant="outline" icon={<UserPlus />} onClick={() => setStep("address")}>
        Set up an account
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3" data-testid="account-setup">
      {step === "address" ? (
        <>
          <Label htmlFor="account-setup-url">Sign-up page</Label>
          <Input
            id="account-setup-url"
            placeholder="example.com/signup"
            value={serviceUrl}
            onChange={(event) => setServiceUrl(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={busy || !serviceUrl.trim()} onClick={() => void open()}>
              {busy ? "Opening…" : "Open on my computer"}
            </Button>
            <Button variant="quiet" onClick={reset}>
              Cancel
            </Button>
          </div>
        </>
      ) : null}

      {step === "typing" ? (
        <>
          <p className="text-xs font-medium text-foreground">
            {setup?.navigated ? `${setup.host} is open on your computer` : `Open ${setup?.host} on your computer`}
          </p>
          <Label htmlFor="account-setup-name">Name</Label>
          <Input id="account-setup-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          <Label htmlFor="account-setup-username">Username or email you used</Label>
          <Input
            id="account-setup-username"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Label htmlFor="account-setup-password">Password you chose</Label>
          <Input
            id="account-setup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              disabled={busy || !displayName.trim() || !username.trim() || !password}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save to my vault"}
            </Button>
            <Button variant="quiet" onClick={reset}>
              Cancel
            </Button>
          </div>
        </>
      ) : null}

      {step === "key" ? (
        <>
          <Label htmlFor="account-setup-key">Authenticator key</Label>
          <Input
            id="account-setup-key"
            autoComplete="off"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy || !key.trim()} onClick={() => void saveKey()}>
              {busy ? "Saving…" : "Save key"}
            </Button>
            {keyNeedsPassword ? (
              <a className="text-xs underline" href="/vault/authenticator" target="_blank" rel="noreferrer">
                Add it in your Vault
              </a>
            ) : null}
            <Button variant="quiet" onClick={() => setStep("done")}>
              No key
            </Button>
          </div>
        </>
      ) : null}

      {step === "done" ? (
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground">Saved</p>
          <Button variant="quiet" onClick={reset}>
            Done
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AccountSetupPanel;
