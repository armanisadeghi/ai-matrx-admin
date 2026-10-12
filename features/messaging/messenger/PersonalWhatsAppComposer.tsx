"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { MessagesComposerInput } from "../components/MessagesComposerInput";
import { PersonalWhatsAppFailure, type PersonalOutboxEntry, type PersonalWhatsAppClient } from "@/features/social-connections/personal-whatsapp-service";

export function PersonalWhatsAppComposer({ client, chatId, grantId, onAccessFailure }: { client: PersonalWhatsAppClient; chatId: string; grantId: string; onAccessFailure: (message: string) => void }) {
  const [draft, setDraft] = useState("");
  const [entries, setEntries] = useState<PersonalOutboxEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  const sending = useRef(false);
  const attemptKey = `matrx:personal-send:${grantId}:${chatId}`;
  const attempt = useRef<{ id: string; text: string } | null>(null);

  useEffect(() => {
    mounted.current = true;
    const pendingId = sessionStorage.getItem(attemptKey);
    if (pendingId) { attempt.current = { id: pendingId, text: "" }; setUncertain(true); }
    const controller = new AbortController();
    client.outbox(chatId, controller.signal).then((saved) => {
      if (!controller.signal.aborted) { setEntries(saved); setReady(true); if (pendingId && saved.some((entry) => entry.client_id === pendingId)) { sessionStorage.removeItem(attemptKey); attempt.current = null; setUncertain(false); } }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Saved sends could not load.");
        if (cause instanceof PersonalWhatsAppFailure && cause.accessLost) onAccessFailure(cause.message);
      }
    });
    return () => { mounted.current = false; controller.abort(); };
  }, [client, chatId, attemptKey, onAccessFailure]);

  const unresolved = uncertain || entries.some((entry) => ["pending", "dispatching", "unknown"].includes(entry.state));
  async function check() {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(null);
    try {
      const saved = await client.outbox(chatId);
      if (!mounted.current) return;
      setEntries(saved); setReady(true);
      // A response lost before persistence must retain its exact request identity.
      const current = attempt.current;
      if (!current || saved.some((entry) => entry.client_id === current.id)) { setUncertain(false); sessionStorage.removeItem(attemptKey); attempt.current = null; }
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error ? cause.message : "Send status could not load."); if (cause instanceof PersonalWhatsAppFailure && cause.accessLost) onAccessFailure(cause.message); }
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  async function send() {
    if (sending.current || !ready || unresolved || !draft.trim()) return;
    sending.current = true; setBusy(true); setError(null);
    const current = attempt.current ?? { id: crypto.randomUUID(), text: draft };
    // Persist only the request identity; message text remains in the encrypted native journal.
    sessionStorage.setItem(attemptKey, current.id);
    attempt.current = current;
    try {
      const receipt = await client.send(chatId, current.id, current.text);
      if (!mounted.current) return;
      setEntries((previous) => [...previous.filter((entry) => entry.client_id !== receipt.client_id), receipt]);
      setDraft(""); sessionStorage.removeItem(attemptKey); attempt.current = null;
    } catch (cause) {
      if (!mounted.current) return;
      setUncertain(true);
      setError(cause instanceof Error ? cause.message : "Send outcome is unconfirmed. Check status.");
      if (cause instanceof PersonalWhatsAppFailure && cause.accessLost) onAccessFailure(cause.message);
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  return <div className="border-t p-3">
    {error && <ErrorNotice size="inline" message={error} />}
    {entries.length > 0 && <ul className="mb-2 space-y-1 text-xs text-muted-foreground" aria-label="Saved send attempts">{entries.slice(-5).map((entry) => <li key={entry.client_id}>
      <span>{entry.network_status === "SUCCESS" ? "Sent" : entry.state === "accepted" ? "Accepted; delivery unconfirmed" : entry.state === "failed" ? "Failed" : entry.state === "cancelled" ? "Cancelled" : "Send unconfirmed"}</span>
      {entry.delivered === true && <span> · Delivery reported</span>}{entry.seen === true && <span> · Read reported</span>}
      {["pending", "dispatching", "unknown", "failed"].includes(entry.state) && <p className="truncate">{entry.draft_text}</p>}
    </li>)}</ul>}
    {(!ready || unresolved || entries.length > 0) && <Button variant="quiet" disabled={busy} onClick={() => void check()}>Check send status</Button>}
    <MessagesComposerInput surfaceName="Personal WhatsApp reply" attachmentsEnabled={false} input={{
      additions: [], add: () => undefined, removeAddition: () => undefined,
      value: draft, onChange: setDraft, disabled: busy || !ready || unresolved,
      canSend: ready && !busy && !unresolved && !!draft.trim(), placeholder: "Message",
      onKeyDown: () => undefined, onSubmit: () => void send(),
    }} />
  </div>;
}
