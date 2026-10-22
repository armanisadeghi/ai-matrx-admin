"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, InfoHint } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { SettingsSection } from "@ai-matrx/design-system/settings";
import { createClient } from "@/utils/supabase/client";
import { authenticatorError, enrollAuthenticator, generateRecoveryCodes, readAuthenticators, removeAuthenticator, verifyAuthenticator, verifyRecoveryCode, type AuthenticatorSetup, type AuthenticatorState } from "./mfa";

export function AuthenticatorSection() {
  const [state, setState] = useState<AuthenticatorState | null>(null);
  const [setup, setSetup] = useState<AuthenticatorSetup | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [replaceCodes, setReplaceCodes] = useState(false);
  const generation = useRef(0);
  const locked = useRef(false);
  const identity = useRef<string | null>(null);
  const pendingSetup = useRef<AuthenticatorSetup | null>(null);
  const cleanup = () => {
    const pending = pendingSetup.current;
    pendingSetup.current = null;
    if (pending) void pending.cancel().catch(() => {
      console.warn("Pending authenticator cleanup failed; remove it in account settings.");
    });
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const version = generation.current;
      try {
        const current = await readAuthenticators();
        if (!active || version !== generation.current) return;
        identity.current = current.userId;
        setState(current);
      } catch {
        if (active && version === generation.current) setError("Couldn’t load authenticators. Try again.");
      }
    };
    void load();
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_OUT" && identity.current === (session?.user.id ?? null)) return;
      generation.current += 1;
      cleanup();
      locked.current = false;
      identity.current = session?.user.id ?? null;
      setBusy(false);
      setRecoveryCodes(null); setRecoveryCode(""); setReplaceCodes(false);
      setSetup(null); setSelected(null); setRemoving(null); setCode(""); setState(null); setNotice(null); setError(null);
      queueMicrotask(() => { if (active && session) void load(); });
    });
    return () => { active = false; generation.current += 1; cleanup(); subscription.unsubscribe(); };
  }, []);

  const run = async (action: (version: number, userId: string) => Promise<void>) => {
    if (locked.current || !state) return;
    locked.current = true; setBusy(true); setError(null); setNotice(null);
    const version = generation.current;
    try { await action(version, state.userId); }
    catch (reason) {
      if (version === generation.current) setError(authenticatorError(reason));
    } finally {
      if (version === generation.current) { locked.current = false; setBusy(false); }
    }
  };

  const begin = () => run(async (version, userId) => {
    const enrolled = await enrollAuthenticator(userId, name);
    if (version !== generation.current) { await enrolled.cancel(); return; }
    pendingSetup.current = enrolled;
    setSetup(enrolled); setSelected(enrolled.id); setCode(""); setRemoving(null);
  });
  const verify = () => run(async (version, userId) => {
    if (!selected) return;
    await verifyAuthenticator(userId, selected, code);
    // Verification updates Auth's real session; never synthesize an AAL2 claim.
    const current = await readAuthenticators();
    if (version !== generation.current) return;
    pendingSetup.current = null;
    setState(current); setSetup(null); setSelected(null); setCode(""); setName("");
    setNotice("Authenticator verified.");
  });
  const remove = (id: string) => run(async (version, userId) => {
    await removeAuthenticator(userId, id);
    const current = await readAuthenticators();
    if (version !== generation.current) return;
    setState(current); setRemoving(null);
    if (setup?.id === id) { pendingSetup.current = null; setSetup(null); setSelected(null); setCode(""); }
    setNotice("Authenticator removed.");
  });
  const generate = () => run(async (version, userId) => {
    const codes = await generateRecoveryCodes(userId, state?.hasRecoveryCodes ?? false);
    if (version !== generation.current) return;
    // The provider shows these once. Preserve that display if the following read fails.
    setRecoveryCodes(codes); setReplaceCodes(false);
    const current = await readAuthenticators();
    if (version !== generation.current) return;
    setState(current);
  });
  const recover = () => run(async (version, userId) => {
    await verifyRecoveryCode(userId, recoveryCode);
    const current = await readAuthenticators();
    if (version !== generation.current) return;
    setState(current); setRecoveryCode(""); setSelected(null); setCode("");
    setNotice("Recovery code verified.");
  });

  return (
    <SettingsSection title="Two-step verification">
      <div className="space-y-4 p-4">
        {error ? <ErrorNotice message={error} size="inline" /> : null}
        {notice ? <p role="status" className="type-body text-success">{notice}</p> : null}
        {!state ? <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload authenticators</Button> : (
          <>
            <div className="flex items-center gap-2 type-body">
              <span>{state.elevated ? "Verified this session" : state.factors.some(factor => factor.verified) ? "Verify this session" : "No verified authenticator"}</span>
              <InfoHint label="About two-step verification" text="Add another authenticator on a separate device so you can still verify if you lose your primary device." />
            </div>
            {state.factors.map(factor => (
              <div key={factor.id} className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
                <span className="min-w-0 flex-1 break-words type-body">{factor.name}</span>
                <span className="type-meta text-muted-foreground">{factor.verified ? "Verified" : "Unverified"}</span>
                {factor.verified ? <Button type="button" variant="outline" disabled={busy || setup !== null} onClick={() => { setSelected(factor.id); setCode(""); setRemoving(null); }}>Verify</Button> : null}
                <Button type="button" variant="outline" disabled={busy || (factor.verified && !state.elevated)} onClick={() => setRemoving(factor.id)}>Remove</Button>
              </div>
            ))}
            {removing ? <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm authenticator removal">
              <span className="type-body">Remove this authenticator?</span>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void remove(removing)}>Confirm removal</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setRemoving(null)}>Keep authenticator</Button>
            </div> : null}
            {!setup ? <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="authenticator-name">Authenticator name</label>
              <Input id="authenticator-name" className="min-w-0 flex-1" value={name} maxLength={64} placeholder="Authenticator name" onChange={event => setName(event.target.value)} disabled={busy} autoComplete="off" />
              <Button type="button" variant="outline" disabled={busy || !name.trim()} onClick={() => void begin()}>Add authenticator</Button>
            </div> : <div className="space-y-2">
              {setup.qrCode.startsWith("data:image/svg+xml") ? <img src={setup.qrCode} width={180} height={180} alt="Scan with your authenticator app" /> : null}
              <details><summary className="cursor-pointer type-body">Setup key</summary><code className="block break-all type-body">{setup.secret}</code></details>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void remove(setup.id)}>Cancel setup</Button>
            </div>}
            {selected ? <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); void verify(); }}>
              <label className="sr-only" htmlFor="authenticator-code">Authenticator code</label>
              <Input id="authenticator-code" className="min-w-0 flex-1" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value)} disabled={busy} />
              <Button type="submit" variant="primary" disabled={busy || !/^\d{6}$/.test(code)}>Verify code</Button>
            </form> : null}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center gap-2 type-body">
                <span>Recovery codes</span>
                <InfoHint label="About recovery codes" text="One-use codes end other password-only sessions; keep your authenticator until saved, and verify it to replace interrupted codes." />
              </div>
              {recoveryCodes ? <div role="region" aria-label="New recovery codes" className="space-y-3">
                <ul className="grid gap-2 sm:grid-cols-2">{recoveryCodes.map(value => <li key={value}><code className="break-all type-body">{value}</code></li>)}</ul>
                <Button type="button" variant="outline" onClick={() => setRecoveryCodes(null)}>I saved these codes</Button>
              </div> : state.elevated ? <>
                {replaceCodes ? <div role="group" aria-label="Replace recovery codes" className="flex flex-wrap items-center gap-2">
                  <span className="type-body">Previous codes stop working immediately. Keep your authenticator ready until you save the new set.</span>
                  <Button type="button" variant="outline" disabled={busy || setup !== null} onClick={() => void generate()}>Confirm replacement</Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => setReplaceCodes(false)}>Keep current codes</Button>
                </div> : <Button type="button" variant="outline" disabled={busy || setup !== null || !state.factors.some(factor => factor.verified)} onClick={() => { if (state.hasRecoveryCodes) setReplaceCodes(true); else void generate(); }}>{state.hasRecoveryCodes ? "Replace recovery codes" : "Generate recovery codes"}</Button>}
              </> : state.hasRecoveryCodes ? <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); void recover(); }}>
                <label className="sr-only" htmlFor="recovery-code">Saved recovery code</label>
                <Input id="recovery-code" type="password" autoComplete="off" className="min-w-0 flex-1" value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} disabled={busy || setup !== null} />
                <Button type="submit" variant="outline" disabled={busy || setup !== null || !recoveryCode.trim()}>Use recovery code</Button>
              </form> : null}
            </div>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
