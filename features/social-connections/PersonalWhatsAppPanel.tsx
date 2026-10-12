"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/official/InfoHint";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createPersonalWhatsAppClient, personalWhatsAppDevelopmentTarget, type PersonalAccount, type PersonalGrant } from "./personal-whatsapp-service";
import { PersonalWhatsAppMessenger } from "@/features/messaging/messenger/PersonalWhatsAppMessenger";

export function PersonalWhatsAppPanel({ messenger = false }: { messenger?: boolean }) {
  const actor = useAppSelector(selectUserId);
  if (!actor) return <p className="p-4 text-sm text-muted-foreground">Sign in to connect WhatsApp.</p>;
  return <PersonalWhatsAppContent key={actor} messenger={messenger} />;
}

function PersonalWhatsAppContent({ messenger }: { messenger: boolean }) {
  const personalWhatsApp = useMemo(() => {
    if (typeof window === "undefined") return createPersonalWhatsAppClient();
    return createPersonalWhatsAppClient(personalWhatsAppDevelopmentTarget(window.location, messenger));
  }, [messenger]);
  const [grant, setGrant] = useState<PersonalGrant | null>(null);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [cleanupRemoved, setCleanupRemoved] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++sequence.current;
    personalWhatsApp.status(controller.signal).then((value) => {
      if (sequence.current === version) setGrant(value);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted && sequence.current === version) setError(cause instanceof Error ? cause.message : "WhatsApp could not load. Retry.");
    });
    return () => { sequence.current += 1; controller.abort(); };
  }, [personalWhatsApp]);

  useEffect(() => {
    if (grant?.status !== "active" || !grant.expires_at) return;
    const delay = Math.max(0, Date.parse(grant.expires_at) - Date.now());
    const timer = window.setTimeout(() => setGrant((value) => value ? { ...value, status: "needs_attention" } : value), Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [grant?.status, grant?.expires_at]);

  async function run(operation: () => Promise<PersonalGrant>, after?: (value: PersonalGrant, current: () => boolean) => Promise<void>) {
    const version = ++sequence.current;
    setBusy(true); setError(null); setAccounts([]);
    try {
      const value = await operation();
      if (sequence.current !== version) return;
      setGrant(value);
      if (after) await after(value, () => sequence.current === version);
    } catch (cause) {
      if (sequence.current !== version) return;
      setGrant(null); setError(cause instanceof Error ? cause.message : "WhatsApp request failed. Retry.");
    } finally { if (sequence.current === version) setBusy(false); }
  }

  async function check() {
    await run(async () => {
      const current = await personalWhatsApp.status();
      return current.status === "active" ? personalWhatsApp.refresh() : current;
    }, async (value, current) => {
      if (value.status !== "pending_credential") return;
      const choices = await personalWhatsApp.accounts();
      if (current()) setAccounts(choices);
    });
  }

  async function connect(reconnect = false, profile: "read" | "read_write" = grant?.request_profile ?? "read") {
    const version = ++sequence.current;
    // Prepare the popup in the click gesture; a blocked popup keeps a normal link.
    const popup = window.open("about:blank", "_blank");
    setBusy(true); setError(null); setAuthorizationUrl(null); setAccounts([]);
    try {
      if (profile === "read_write") await personalWhatsApp.ensureWriteSupport();
      if (reconnect) { const retired = await personalWhatsApp.disconnect(); if (sequence.current === version) setGrant(retired); if (retired.status !== "retired" || retired.provider_revoke_pending || retired.cloud_retirement_pending) throw new Error("Finish WhatsApp cleanup before changing access."); }
      const started = await personalWhatsApp.start(profile);
      if (sequence.current !== version) { popup?.close(); return; }
      setGrant(started.grant); setAuthorizationUrl(started.authorization_url);
      if (popup) { popup.opener = null; popup.location.assign(started.authorization_url); }
    } catch (cause) {
      popup?.close();
      if (sequence.current === version) setError(cause instanceof Error ? cause.message : "WhatsApp consent failed. Retry.");
    } finally { if (sequence.current === version) setBusy(false); }
  }

  const accessFailure = useCallback((message: string) => {
    setError(message); setAccounts([]);
    setGrant((value) => value ? { ...value, status: "needs_attention" } : value);
  }, []);
  const acceptSelection = useCallback((value: PersonalGrant) => setGrant(value), []);
  const ready = grant?.status === "active" && !!grant.expires_at 
    && grant.resources_generation === grant.generation;
  const label = ready ? "Connected" : grant?.status === "retired" || grant?.status === "not_connected" ? "Disconnected"
    : grant?.status === "pending_local" ? "Awaiting consent" : grant?.status === "pending_credential" ? "Choose account"
      : grant?.status === "revoking" ? "Cleanup pending" : grant?.status === "needs_attention" ? "Reconnect required" : "Unavailable";

  return <div className={messenger ? "flex h-full min-h-0 flex-col" : "space-y-3 rounded-lg border p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Personal WhatsApp</span>
        <InfoHint text="Connects WhatsApp through Beeper Desktop on this computer; keep Beeper and AI Matrx Local open." />
        <Badge variant="secondary">{label}</Badge>
        <Badge variant="outline">{grant?.request_profile === "read_write" ? "Sending enabled" : "Read-only"}</Badge>
        <InfoHint text="Consent lasts up to one day; renewing access opens Beeper consent again." />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void check()}>Check connection</Button>
        {(!grant || grant.status === "not_connected" || grant.status === "retired") && <Button disabled={busy} onClick={() => void connect()}>Connect</Button>}
        {grant && grant.status !== "not_connected" && grant.status !== "retired" && !grant.recovery_required && <Button variant="outline" disabled={busy} onClick={() => void run(() => personalWhatsApp.disconnect())}>Disconnect</Button>}
        {grant?.status === "needs_attention" && !grant.recovery_required && <Button disabled={busy} onClick={() => void connect(true)}>Reconnect</Button>}
        {grant?.status === "needs_attention" && !grant.recovery_required && <Button variant="outline" disabled={busy} onClick={() => void run(async () => (await personalWhatsApp.reconcile()).grant)}>Reconcile</Button>}
        {ready && grant.request_profile === "read" && <Button disabled={busy} onClick={() => void connect(true, "read_write")}>Enable sending</Button>}
        {ready && !messenger && <Button asChild><Link href="/messenger/whatsapp">Open chats</Link></Button>}
      </div>
    </div>
    {error && <div className="px-3"><ErrorNotice size="inline" message={error} /></div>}
    {grant?.status === "pending_local" && authorizationUrl && <div className="px-3 text-sm"><a className="underline" href={authorizationUrl} target="_blank" rel="noreferrer">Open Beeper consent</a><InfoHint text={grant.request_profile === "read_write" ? "Approve read and sensitive actions for one day, then select Check connection." : "Approve read-only access for one day, then select Check connection."} /></div>}
    {accounts.length > 0 && grant?.status === "pending_credential" && <div className="flex flex-wrap gap-2 px-3">{accounts.map((account) => <Button key={account.account_ref} variant="outline" disabled={busy || account.status !== "connected"} onClick={() => void run(async () => (await personalWhatsApp.selectAccount(account.account_ref)).grant)}>{account.name}</Button>)}</div>}
    {grant?.recovery_required && grant.cleanup_client_label && grant.revision && <div className="space-y-2 px-3 text-sm">
      <div className="flex items-center gap-2"><span>Interrupted consent</span><InfoHint text="In Beeper Settings → Developer, remove this app under Authorized Connections, then confirm its removal here." /></div>
      <code className="block break-all text-xs">{grant.cleanup_client_label}</code>
      <label className="flex items-center gap-2"><input type="checkbox" checked={cleanupRemoved} onChange={(event) => setCleanupRemoved(event.target.checked)} />I removed this approval in Beeper</label>
      <Button disabled={busy || !cleanupRemoved} onClick={() => void run(() => personalWhatsApp.confirmNativeCleanup(grant.revision ?? 0, grant.cleanup_client_label ?? ""))}>Confirm cleanup</Button>
    </div>}
    {ready && messenger && !busy && <div className="min-h-0 flex-1"><PersonalWhatsAppMessenger key={`${grant.id}:${grant.generation}`} grant={grant} client={personalWhatsApp} onSelection={acceptSelection} onAccessFailure={accessFailure} /></div>}
  </div>;
}
