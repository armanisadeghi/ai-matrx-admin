"use client";

// A person's Security tab (users one-roof lane S): Auth0's Details / Devices / History / Raw JSON
// on one page. ONE read — admin.user_security(p_user), every part by an index on the person — and
// its row actions, each asking a reason through the one reason prompt and writing
// admin.admin_audit_log inside its SQL function: iam.end_session (one sign-in),
// iam.remove_mfa_factor, iam.revoke_api_key_for_person. Sign out everywhere is the page's
// registered action (useUserActions). Sign-in history is its own read (admin.user_sign_ins_page over
// iam.sign_in_event, captured by auth triggers since 2026-10-21 — UserSignInHistory); Active sessions
// lists only the sign-ins still live.

import { useEffect, useState, type ReactNode } from "react";
import { Fingerprint, History, KeyRound, LogOut, MonitorSmartphone, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow, RegionSkeleton, type BadgeTone, KpiGrid, KpiTile } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { MatrxUuidCell } from "@ai-matrx/design-system/data-table/uuid-cell";
import { formatCount } from "@ai-matrx/kit/format";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import AppLink from "@/components/navigation/AppLink";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject, type JsonObject } from "@/types/json";
import { toast } from "@/lib/toast";
import { useRecordLoad } from "./useRecordLoad";
import { UserSignInHistory } from "./UserSignInHistory";
import { deviceOf } from "./signInPaging";
import { useReasonPrompt } from "./useReasonPrompt";
import { adminOrganizationHref } from "./UserOrganizationsTab";
import { personTitle } from "./userOverview";
import type { UserTabBodyProps } from "./UserRecordPage";

// ── the read ────────────────────────────────────────────────────────────────────────────────

export interface SecurityAccount {
  id: string;
  email: string | null;
  phone: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  confirmed_at: string | null;
  invited_at: string | null;
  confirmation_sent_at: string | null;
  recovery_sent_at: string | null;
  email_change: string | null;
  email_change_sent_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  is_anonymous: boolean;
  is_sso_user: boolean;
  has_password: boolean;
  app_metadata: JsonObject;
  user_metadata: JsonObject;
}

export interface SecurityIdentity {
  id: string;
  provider: string;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in_at: string | null;
}

export interface SecurityFactor {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  last_challenged_at: string | null;
}

export interface SecuritySession {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  refreshed_at: string | null;
  not_after: string | null;
  user_agent: string | null;
  ip: string | null;
  aal: string | null;
  tag: string | null;
  oauth_client: string | null;
  refresh_tokens: number;
  active_refresh_tokens: number;
  last_token_at: string | null;
}

export interface SecurityApiKey {
  id: string;
  key_id: string;
  name: string;
  display_prefix: string;
  kind: string;
  organization_id: string | null;
  organization_name: string | null;
  status: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface SecurityConsent {
  id: string;
  client_id: string;
  client_name: string | null;
  client_uri: string | null;
  scopes: string | null;
  granted_at: string;
  revoked_at: string | null;
}

export interface SecurityConnection {
  id: string;
  provider: string;
  account_email: string | null;
  account_name: string | null;
  scopes: string[] | null;
  status: string;
  last_verified_at: string | null;
  last_error: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSecurity {
  account: SecurityAccount;
  identities: SecurityIdentity[];
  mfa_factors: SecurityFactor[];
  sessions: SecuritySession[];
  sign_in_source: "sessions";
  api_keys: SecurityApiKey[];
  oauth_consents: SecurityConsent[];
  connections: SecurityConnection[];
  computed_at: string;
}

export async function fetchUserSecurity(userId: string): Promise<UserSecurity | null> {
  const { data, error } = await createClient().schema("admin").rpc("user_security", { p_user: userId });
  if (error) throw new Error(error.message);
  if (data === null) return null;
  if (!isJsonObject(data) || !isJsonObject(data.account) || !Array.isArray(data.sessions)) {
    throw new Error("admin.user_security returned an unexpected shape");
  }
  // Every key is built by jsonb_build_object in the RPC; the guard checks the envelope.
  return data as unknown as UserSecurity;
}

// ── helpers ─────────────────────────────────────────────────────────────────────────────────

function when(iso: string | null | undefined): string | null {
  return iso
    ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
}

const FACTOR_LABEL: Record<string, string> = { totp: "Authenticator app", phone: "Phone (SMS)", webauthn: "Passkey" };
const KIND_LABEL: Record<string, string> = { personal_key: "Personal", api_key_service: "Service" };

function statusTone(status: string): BadgeTone {
  if (status === "active" || status === "verified" || status === "connected") return "success";
  if (status === "revoked" || status === "error" || status === "expired") return "destructive";
  return "neutral";
}

function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

function Section({ title, icon: Icon, extra, children }: { title: string; icon: typeof KeyRound; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          {title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

// ── columns ─────────────────────────────────────────────────────────────────────────────────

const IDENTITY_COLUMNS: MatrxColumnDef<SecurityIdentity>[] = [
  { id: "provider", accessorKey: "provider", header: "Method", filter: "select", width: 140 },
  { id: "email", accessorFn: (r) => r.email ?? "", header: "Email", width: 240 },
  { id: "created_at", accessorKey: "created_at", header: "Linked", format: { id: "datetime" }, width: 170 },
  { id: "last_sign_in_at", accessorKey: "last_sign_in_at", header: "Last sign-in", format: { id: "datetime" }, width: 170 },
];

const FACTOR_COLUMNS: MatrxColumnDef<SecurityFactor>[] = [
  { id: "type", accessorFn: (r) => FACTOR_LABEL[r.factor_type] ?? r.factor_type, header: "Factor", filter: "select", width: 170 },
  { id: "name", accessorFn: (r) => r.friendly_name ?? r.phone ?? "", header: "Name", width: 200 },
  { id: "status", accessorKey: "status", header: "Status", filter: "select", width: 120, cell: (r) => <StatusBadge status={r.status} /> },
  { id: "created_at", accessorKey: "created_at", header: "Added", format: { id: "datetime" }, width: 170 },
  { id: "last_challenged_at", accessorKey: "last_challenged_at", header: "Last used", format: { id: "datetime" }, width: 170 },
];

const SESSION_COLUMNS: MatrxColumnDef<SecuritySession>[] = [
  {
    id: "device",
    accessorFn: (r) => deviceOf(r.user_agent),
    header: "Device",
    filter: "select",
    width: 180,
    cell: (r) => <span title={r.user_agent ?? undefined}>{deviceOf(r.user_agent)}</span>,
  },
  { id: "ip", accessorFn: (r) => r.ip ?? "", header: "IP", width: 140, cell: (r) => <span className="font-mono type-meta">{r.ip ?? "—"}</span> },
  { id: "created_at", accessorKey: "created_at", header: "Signed in", format: { id: "datetime" }, width: 170 },
  { id: "last_active", accessorFn: (r) => r.refreshed_at ?? r.last_token_at ?? r.updated_at ?? "", header: "Last active", format: { id: "datetime" }, width: 170 },
  { id: "aal", accessorFn: (r) => (r.aal === "aal2" ? "Two-step" : "Password / link"), header: "Level", filter: "select", width: 140 },
  { id: "via", accessorFn: (r) => r.oauth_client ?? "AI Matrx", header: "Through", filter: "select", width: 140 },
  { id: "tokens", accessorKey: "active_refresh_tokens", header: "Live tokens", width: 110 },
  { id: "not_after", accessorKey: "not_after", header: "Expires", format: { id: "datetime" }, width: 170 },
];

const KEY_COLUMNS: MatrxColumnDef<SecurityApiKey>[] = [
  { id: "name", accessorKey: "name", header: "Name", width: 180 },
  { id: "prefix", accessorKey: "display_prefix", header: "Key", width: 180, cell: (r) => <span className="font-mono type-meta">{r.display_prefix}</span> },
  { id: "kind", accessorFn: (r) => KIND_LABEL[r.kind] ?? r.kind, header: "Kind", filter: "select", width: 110 },
  {
    id: "organization",
    accessorFn: (r) => r.organization_name ?? "",
    header: "Organization",
    filter: "select",
    width: 200,
    cell: (r) =>
      r.organization_id ? (
        <AppLink href={adminOrganizationHref(r.organization_id)} className="hover:text-primary">
          {r.organization_name ?? r.organization_id}
        </AppLink>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  { id: "status", accessorKey: "status", header: "Status", filter: "select", width: 110, cell: (r) => <StatusBadge status={r.status} /> },
  { id: "created_at", accessorKey: "created_at", header: "Created", format: { id: "datetime" }, width: 170 },
  { id: "last_used_at", accessorKey: "last_used_at", header: "Last used", format: { id: "datetime" }, width: 170 },
  { id: "expires_at", accessorKey: "expires_at", header: "Expires", format: { id: "datetime" }, width: 170 },
];

interface AppRow {
  id: string;
  source: "OAuth app" | "Integration";
  name: string;
  account: string;
  scopes: string;
  status: string;
  since: string;
  organization_id: string | null;
}

function appRowsOf(s: UserSecurity): AppRow[] {
  return [
    ...s.oauth_consents.map((c) => ({
      id: `c:${c.id}`,
      source: "OAuth app" as const,
      name: c.client_name ?? c.client_id,
      account: c.client_uri ?? "",
      scopes: c.scopes ?? "",
      status: c.revoked_at ? "revoked" : "active",
      since: c.granted_at,
      organization_id: null,
    })),
    ...s.connections.map((c) => ({
      id: `i:${c.id}`,
      source: "Integration" as const,
      name: c.provider.replace(/_/g, " "),
      account: c.account_email ?? c.account_name ?? "",
      scopes: (c.scopes ?? []).join(" "),
      status: c.status,
      since: c.created_at,
      organization_id: c.organization_id,
    })),
  ];
}

const APP_COLUMNS: MatrxColumnDef<AppRow>[] = [
  { id: "name", accessorKey: "name", header: "App", width: 180 },
  { id: "source", accessorKey: "source", header: "Kind", filter: "select", width: 120 },
  { id: "account", accessorKey: "account", header: "Account", width: 220 },
  { id: "status", accessorKey: "status", header: "Status", filter: "select", width: 110, cell: (r) => <StatusBadge status={r.status} /> },
  { id: "scopes", accessorKey: "scopes", header: "Scopes", width: 260, cell: (r) => <span className="truncate type-meta" title={r.scopes}>{r.scopes || "—"}</span> },
  { id: "since", accessorKey: "since", header: "Since", format: { id: "datetime" }, width: 170 },
  {
    id: "organization",
    accessorFn: (r) => r.organization_id ?? "",
    header: "Organization",
    width: 140,
    cell: (r) =>
      r.organization_id ? (
        <AppLink href={adminOrganizationHref(r.organization_id)} className="hover:text-primary">
          Open
        </AppLink>
      ) : (
        <span className="text-muted-foreground">Personal</span>
      ),
  },
];

// ── the actions ─────────────────────────────────────────────────────────────────────────────

type Pending =
  | { kind: "session"; id: string; label: string }
  | { kind: "factor"; id: string; label: string }
  | { kind: "key"; id: string; label: string };

const ACTION_COPY: Record<Pending["kind"], { title: (label: string, who: string) => string; description: string; confirm: string }> = {
  session: {
    title: (label, who) => `End ${who}'s sign-in on ${label}?`,
    description: "Signs out that device within an hour; others stay.",
    confirm: "End session",
  },
  factor: {
    title: (label, who) => `Remove ${who}'s ${label}?`,
    description: "Ends their current sign-ins; existing access may last until tokens expire.",
    confirm: "Remove factor",
  },
  key: {
    title: (label) => `Revoke the API key "${label}"?`,
    description: "Every request using it fails; this is permanent.",
    confirm: "Revoke key",
  },
};

async function runAction(userId: string, p: Pending, reason: string): Promise<string> {
  const iam = createClient().schema("iam");
  const r = reason.trim();
  const { data, error } =
    p.kind === "session"
      ? await iam.rpc("end_session", { p_user: userId, p_session: p.id, p_reason: r })
      : p.kind === "factor"
        ? await iam.rpc("remove_mfa_factor", { p_user: userId, p_factor: p.id, p_reason: r })
        : await iam.rpc("revoke_api_key_for_person", { p_user: userId, p_key: p.id, p_reason: r });
  if (error) throw new Error(error.message);
  if (p.kind === "key" && isJsonObject(data) && data.already === true) return "That key was already revoked";
  return p.kind === "session" ? "Session ended" : p.kind === "factor" ? "Factor removed" : "Key revoked";
}

// ── the tab ─────────────────────────────────────────────────────────────────────────────────

export function UserSecurityTab({ userId, overview, version: pageVersion, reload, actions, subject, shareForAi }: UserTabBodyProps) {
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useRecordLoad(fetchUserSecurity, userId, pageVersion + version);
  const { askReason, reasonDialog } = useReasonPrompt();
  const retry = () => setVersion((v) => v + 1);
  const read = (what: string) => readOf({ loading, error }, { what, onRetry: retry });
  const who = personTitle(overview);
  const signOutBlocked = actions.blockedReason("sign_out_everywhere", subject);
  useEffect(() => shareForAi(data), [data, shareForAi]);

  // Each row action asks its reason through the one prompt; the page (and this tab) re-read after.
  const setPending = (p: Pending) => {
    const copy = ACTION_COPY[p.kind];
    askReason({
      title: copy.title(p.label, who),
      description: copy.description,
      confirmLabel: copy.confirm,
      run: async (reason) => {
        toast.success(await runAction(userId, p, reason));
        reload();
      },
    });
  };

  if (!loading && !error && data === null) {
    return <ErrorNotice size="inline" message="No auth record for this account." error={`admin.user_security returned nothing for ${userId}`} operation="Read security" calls={["admin.user_security"]} />;
  }

  const s = data;
  const a = s?.account ?? null;
  const sessions = s?.sessions ?? [];
  const factors = s?.mfa_factors ?? [];
  const keys = s?.api_keys ?? [];
  const apps = s ? appRowsOf(s) : [];

  return (
    <div className="flex flex-col gap-4" data-testid="user-security-tab">
      <KpiGrid className="lg:grid-cols-5">
        <KpiTile label="Sign-in methods" value={s ? formatCount(s.identities.length) : null} />
        <KpiTile label="MFA factors" value={s ? formatCount(factors.filter((f) => f.status === "verified").length) : null} hint={s ? `${formatCount(factors.length)} set up` : undefined} />
        <KpiTile label="Active sessions" value={s ? formatCount(sessions.length) : null} />
        <KpiTile label="Live API keys" value={s ? formatCount(keys.filter((k) => k.status === "active").length) : null} hint={s ? `${formatCount(keys.length)} total` : undefined} />
        <KpiTile label="Connected apps" value={s ? formatCount(apps.filter((r) => r.status !== "revoked").length) : null} />
      </KpiGrid>

      {error ? <ErrorNotice size="inline" message="Security details could not load." error={error instanceof Error ? error.message : String(error)} operation="Read security" calls={["admin.user_security"]} /> : null}

      <Section title="Sign-in methods" icon={Fingerprint}>
        <MatrxDataTable
          data={s?.identities ?? []}
          columns={IDENTITY_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          read={read("sign-in methods")}
          emptyState={{ title: "No linked sign-in methods", icon: <Fingerprint className="h-6 w-6 text-muted-foreground" /> }}
        />
        <div className="border-t border-border px-3 py-2 type-meta text-muted-foreground">MFA factors</div>
        <MatrxDataTable
          data={factors}
          columns={FACTOR_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          read={read("MFA factors")}
          emptyState={{ title: "No MFA factors", icon: <ShieldCheck className="h-6 w-6 text-muted-foreground" /> }}
          rowActions={(r) => [
            {
              id: "remove",
              icon: Trash2,
              label: "Remove factor",
              tone: "destructive",
              onClick: () => setPending({ kind: "factor", id: r.id, label: FACTOR_LABEL[r.factor_type] ?? r.factor_type }),
            },
          ]}
        />
      </Section>

      <Section
        title="Active sessions"
        icon={MonitorSmartphone}
        extra={
          <Button
            variant="outline"
            disabled={!sessions.length || signOutBlocked !== null}
            title={signOutBlocked ?? undefined}
            onClick={() => actions.run("sign_out_everywhere", subject)}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out everywhere
          </Button>
        }
      >
        <MatrxDataTable
          data={sessions}
          columns={SESSION_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          read={read("sessions")}
          emptyState={{ title: "Not signed in anywhere", icon: <MonitorSmartphone className="h-6 w-6 text-muted-foreground" /> }}
          toolbar={{ search: true, searchPlaceholder: "Search sessions…" }}
          rowActions={(r) => [
            {
              id: "end",
              icon: LogOut,
              label: "End session",
              tone: "destructive",
              onClick: () => setPending({ kind: "session", id: r.id, label: deviceOf(r.user_agent) }),
            },
          ]}
        />
      </Section>

      <Section title="Sign-in history" icon={History}>
        <UserSignInHistory userId={userId} version={pageVersion + version} />
      </Section>

      <Section title="API keys" icon={KeyRound}>
        <MatrxDataTable
          data={keys}
          columns={KEY_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          read={read("API keys")}
          emptyState={{ title: "No API keys", icon: <KeyRound className="h-6 w-6 text-muted-foreground" /> }}
          toolbar={{ search: true, searchPlaceholder: "Search keys…" }}
          rowActionDefs={[
            {
              id: "revoke",
              icon: Trash2,
              label: "Revoke key",
              tone: "destructive",
              appliesTo: (r) => r.status === "active",
              unavailableTooltip: "Already revoked",
              onClick: (r) => setPending({ kind: "key", id: r.id, label: r.name }),
            },
          ]}
        />
      </Section>

      <Section title="Connected apps" icon={PlugZap}>
        <MatrxDataTable
          data={apps}
          columns={APP_COLUMNS}
          getRowId={(r) => r.id}
          isLoading={loading}
          read={read("connected apps")}
          emptyState={{ title: "No connected apps", icon: <PlugZap className="h-6 w-6 text-muted-foreground" /> }}
        />
      </Section>

      <Section title="Account record" icon={ShieldCheck}>
        {loading && !a ? (
          <RegionSkeleton />
        ) : a ? (
          <div className="grid gap-4 p-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <PropertyRow label="User ID">
                <MatrxUuidCell value={a.id} />
              </PropertyRow>
              <PropertyRow label="Email confirmed" value={when(a.email_confirmed_at)} missing={a.email_confirmed_at ? undefined : "Not confirmed"} />
              <PropertyRow label="Phone confirmed" value={when(a.phone_confirmed_at)} missing={a.phone ? (a.phone_confirmed_at ? undefined : "Not confirmed") : "No phone"} />
              {a.email_change ? <PropertyRow label="Email change pending" value={a.email_change} meta={when(a.email_change_sent_at)} /> : null}
              <PropertyRow label="Password set" value={a.has_password ? "Yes" : "No"} />
              <PropertyRow label="Banned until" value={when(a.banned_until)} missing={a.banned_until ? undefined : "Not banned"} />
              <PropertyRow label="Last sign-in" value={when(a.last_sign_in_at)} missing={a.last_sign_in_at ? undefined : "Never"} />
              <PropertyRow label="Recovery sent" value={when(a.recovery_sent_at)} missing={a.recovery_sent_at ? undefined : "Never"} />
              <PropertyRow label="Created" value={when(a.created_at)} />
              <PropertyRow label="Updated" value={when(a.updated_at)} />
              <PropertyRow label="Account type" value={[a.is_anonymous ? "Guest" : "Person", a.is_sso_user ? "SSO" : null].filter(Boolean).join(" · ")} />
            </div>
            <JsonInspector data={a} label="Raw auth record" showSource defaultExpandDepth={2} />
          </div>
        ) : null}
      </Section>

      {reasonDialog}
    </div>
  );
}
