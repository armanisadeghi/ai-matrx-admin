"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { readAllRows } from "@ai-matrx/data/db";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@ai-matrx/design-system/controls";
import { Badge } from "@/components/ui/badge";
import { InfoHint } from "@/components/official/InfoHint";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/lib/toast";
import { configReceipt, connectionReceipt, discoveryReceipt, signupReceipt, launchWhatsAppSignup, loadWhatsAppSdk, whatsappRequest } from "./whatsapp-service";

const savedConnection = z.object({ id: z.string().uuid(), account_name: z.string().nullable(), status: z.enum(["connected", "disconnected", "needs_attention"]) });
type SavedConnection = z.infer<typeof savedConnection>;
type Discovery = z.infer<typeof discoveryReceipt>;
type Prepared = { signup: z.infer<typeof signupReceipt>; proof: string; sdk: Awaited<ReturnType<typeof loadWhatsAppSdk>> };

async function loadConnections() {
  const client = createClient();
  const rows = await readAllRows(({ from, to }) => client.schema("users").from("integration_connections")
    .select("id,account_name,status", { count: "exact" }).eq("owner_type", "user")
    .eq("provider", "whatsapp_business").is("deleted_at", null).order("id").range(from, to), { label: "WhatsApp customer connections" });
  return rows.map((row) => savedConnection.parse(row));
}

export function WhatsAppBusinessPanel({ organizationId }: { organizationId: string }) {
  return <WhatsAppBusinessContent key={organizationId} organizationId={organizationId} />;
}

function WhatsAppBusinessContent({ organizationId }: { organizationId: string }) {
  const [connections, setConnections] = useState<SavedConnection[]>([]);
  const [discoveries, setDiscoveries] = useState<Record<string, Discovery>>({});
  const [registration, setRegistration] = useState<{ connectionId: string; resourceRef: string } | null>(null);
  const [pin, setPin] = useState("");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [reconnectId, setReconnectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const context = useRef(0);

  useEffect(() => {
    const version = ++context.current;
    const current = () => context.current === version;
    async function prepare() {
      const [config, accounts] = await Promise.all([whatsappRequest("config", organizationId).then((r) => configReceipt.parse(r)), loadConnections()]);
      if (!current()) return;
      setConnections(accounts);
      if (config.status !== "available") throw new Error("WhatsApp signup needs configuration. Contact support.");
      if (window.location.protocol !== "https:") throw new Error("Open this page using HTTPS to connect WhatsApp.");
      const proof = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(proof));
      const browser_proof_hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const [signup, sdk] = await Promise.all([
        whatsappRequest("start", organizationId, { browser_proof_hash, return_url: "/user-settings/integrations", ...(reconnectId ? { connection_id: reconnectId } : {}) }).then((r) => signupReceipt.parse(r)),
        loadWhatsAppSdk(),
      ]);
      if (current()) { setPrepared({ signup, sdk, proof }); setBusy(false); }
    }
    void prepare().catch((cause: unknown) => { if (current()) setError(cause instanceof Error ? cause.message : "WhatsApp could not load. Try again."); });
    return () => { context.current += 1; };
  }, [organizationId, reconnectId, generation]);

  async function connect() {
    if (!prepared || busy) return;
    if (Date.parse(prepared.signup.expires_at) <= Date.now()) { setPrepared(null); setGeneration((v) => v + 1); setError("Signup expired. Select Connect again."); return; }
    const version = context.current;
    const current = () => context.current === version;
    setBusy(true); setError(null);
    try {
      // The SDK popup is launched synchronously inside the click gesture. All
      // network preparation happens beforehand so browsers do not block it.
      const grant = await launchWhatsAppSignup(prepared.sdk, prepared.signup.app_id, prepared.signup.config_id);
      if (!current()) return;
      connectionReceipt.parse(await whatsappRequest("complete", organizationId, { state: prepared.signup.state, browser_proof: prepared.proof, code: grant.code, waba_id: grant.wabaId }));
      if (!current()) return;
      toast.success("WhatsApp business account connected.");
      setPrepared(null); setReconnectId(null); setGeneration((v) => v + 1);
    } catch (cause) { if (current()) { setPrepared(null); setError(cause instanceof Error ? cause.message : "WhatsApp signup failed. Start again."); setGeneration((v) => v + 1); } }
    finally { if (current()) setBusy(false); }
  }

  async function run(connectionId: string, operation: "discover" | "refresh" | "disconnect", after?: string) {
    const version = context.current;
    const current = () => context.current === version;
    setBusy(true); setError(null);
    try {
      const output = await whatsappRequest(operation, organizationId, { connection_id: connectionId, ...(after ? { after } : {}) });
      if (!current()) return;
      if (operation === "discover") {
        const receipt = discoveryReceipt.parse(output);
        setDiscoveries((previous) => ({ ...previous, [connectionId]: after && previous[connectionId] ? { ...receipt, resources: [...previous[connectionId].resources, ...receipt.resources] } : receipt }));
      } else {
        connectionReceipt.parse(output);
        toast.success(operation === "disconnect" ? "Disconnected from AI Matrx." : "WhatsApp access checked.");
        setPrepared(null); setDiscoveries({}); setGeneration((v) => v + 1);
      }
    } catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : "WhatsApp request failed. Try again."); }
    finally { if (current()) setBusy(false); }
  }

  async function select(connectionId: string, resourceRef: string) {
    const version = context.current;
    setBusy(true); setError(null);
    try {
      await whatsappRequest("select", organizationId, { connection_id: connectionId, resource_ref: resourceRef });
      if (context.current !== version) return;
      const receipt = discoveryReceipt.parse(await whatsappRequest("discover", organizationId, { connection_id: connectionId }));
      if (context.current === version) setDiscoveries((previous) => ({ ...previous, [connectionId]: receipt }));
    } catch (cause) { if (context.current === version) setError(cause instanceof Error ? cause.message : "Phone selection failed. Try again."); }
    finally { if (context.current === version) setBusy(false); }
  }

  async function registerPhone() {
    if (!registration || !/^[0-9]{6}$/.test(pin) || busy) return;
    const version = context.current;
    setBusy(true); setError(null);
    try {
      const result = await whatsappRequest("register", organizationId, { connection_id: registration.connectionId, resource_ref: registration.resourceRef, pin });
      z.object({ resource_id: z.string().uuid(), registration_status: z.literal("registered") }).parse(result);
      if (context.current !== version) return;
      const receipt = discoveryReceipt.parse(await whatsappRequest("discover", organizationId, { connection_id: registration.connectionId }));
      if (context.current !== version) return;
      setDiscoveries((previous) => ({ ...previous, [registration.connectionId]: receipt }));
      setPin(""); setRegistration(null); toast.success("Phone registered.");
    } catch (cause) { if (context.current === version) setError(cause instanceof Error ? cause.message : "Phone registration failed. Try again."); }
    finally { if (context.current === version) setBusy(false); }
  }

  return <Card><CardContent className="space-y-3 p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-medium">WhatsApp Business <InfoHint text="Connect your own WhatsApp business account and choose the phone numbers AI Matrx can use." /></h3><Badge variant="outline">Approved testers only</Badge></div>
    {error && <ErrorNotice size="inline" message={error} />}
    {connections.map((connection) => <div key={connection.id} className="space-y-2">
      <Button variant="quiet" disabled={busy || connection.status === "disconnected"} onClick={() => void run(connection.id, "discover")}>{connection.account_name ?? "Business account"}</Button>
      <Badge variant="outline">{connection.status === "connected" ? "Connected" : connection.status === "disconnected" ? "Disconnected" : "Needs attention"}</Badge>
      <div className="flex flex-wrap gap-2">
        {connection.status !== "disconnected" && <><Button variant="outline" disabled={busy} onClick={() => void run(connection.id, "refresh")}>Check access</Button><Button variant="outline" disabled={busy} onClick={() => void run(connection.id, "disconnect")}>Disconnect</Button></>}
        <Button variant="outline" disabled={busy} onClick={() => { setPrepared(null); setReconnectId(connection.id); setGeneration((v) => v + 1); }}>Prepare reconnect</Button>
      </div>
      {discoveries[connection.id]?.resources.map((phone) => <div key={phone.resource_ref} className="flex items-center justify-between gap-2"><span>{phone.display_name}</span><Button variant="outline" disabled={busy || phone.selected} onClick={() => void select(connection.id, phone.resource_ref)}>{phone.selected ? "Selected" : "Select phone"}</Button>{phone.selected && <>{phone.metadata.registration_status === "registered" ? <Badge variant="outline">Registered</Badge> : <Button variant="outline" disabled={busy} onClick={() => { setPin(""); setRegistration({ connectionId: connection.id, resourceRef: phone.resource_ref }); }}>Register phone</Button>}</>}</div>)}
      {discoveries[connection.id]?.after && <Button variant="quiet" disabled={busy} onClick={() => void run(connection.id, "discover", discoveries[connection.id].after ?? undefined)}>More phones</Button>}
    </div>)}
    {registration && <div className="flex items-center gap-2"><Input type="password" inputMode="numeric" autoComplete="off" maxLength={6} aria-label="Phone registration PIN" placeholder="6-digit PIN" value={pin} onChange={(event) => setPin(event.target.value.replace(/[^0-9]/g, ""))} /><Button disabled={busy || !/^[0-9]{6}$/.test(pin)} onClick={() => void registerPhone()}>Register</Button><Button variant="quiet" disabled={busy} onClick={() => { setPin(""); setRegistration(null); }}>Cancel</Button><InfoHint text="Register only a number added through WhatsApp Business signup. AI Matrx stores this PIN in your private Vault." /></div>}
    <div className="flex gap-2"><Button disabled={busy || !prepared} onClick={() => void connect()}>{reconnectId ? "Reconnect WhatsApp" : "Connect WhatsApp Business"}</Button><Button variant="quiet" disabled={busy} onClick={() => { setPrepared(null); setError(null); setGeneration((v) => v + 1); }}>Reload</Button></div>
  </CardContent></Card>;
}
