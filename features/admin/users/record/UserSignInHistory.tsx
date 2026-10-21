"use client";

// A person's sign-in history — the Security tab's "Sign-in history" section. ONE read:
// admin.user_sign_ins (migration 20261022150000_iam_sign_in_history.sql), which pages
// iam.sign_in_event newest first, strictly before a cursor. Every sign-in since 2026-10-21 is
// captured by triggers on auth.sessions / auth.mfa_amr_claims; older rows were seeded from the
// sessions live that day. Live sessions (with End session) stay in the Active sessions table.

import { useState } from "react";
import { History } from "lucide-react";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import { useRecordLoad } from "./useRecordLoad";

/** "Chrome on Mac" from a user agent; the full string stays in the cell's tooltip. */
export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /node|undici|python|curl|axios|okhttp|Go-http/i.test(ua)
              ? "Script"
              : null;
  const os = /iPhone|iPad|iOS/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? ua.slice(0, 40);
}

export const SIGN_IN_PAGE = 50;

export interface SignInEvent {
  id: string;
  signed_in_at: string;
  method: string | null;
  provider: string | null;
  aal: string | null;
  ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  session_live: boolean;
  oauth_client: string | null;
  seeded: boolean;
}

export interface SignInPage {
  items: SignInEvent[];
  has_more: boolean;
}

export async function fetchSignIns(userId: string, before: string | null = null): Promise<SignInPage> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("user_sign_ins", { p_user: userId, p_limit: SIGN_IN_PAGE, ...(before ? { p_before: before } : {}) });
  if (error) throw new Error(error.message);
  if (!isJsonObject(data) || !Array.isArray(data.items) || typeof data.has_more !== "boolean") {
    throw new Error("admin.user_sign_ins returned an unexpected shape");
  }
  // Every key is built by jsonb_build_object in the RPC; the guard checks the envelope.
  return data as unknown as SignInPage;
}

const METHOD_LABEL: Record<string, string> = {
  password: "Password",
  otp: "One-time code",
  magiclink: "Magic link",
  oauth: "Social sign-in",
  "sso/saml": "SSO",
  anonymous: "Guest",
  totp: "Authenticator app",
  mfa: "Two-step",
  "oauth_provider/authorization_code": "Connected app",
};

/** "Google", "Password", "One-time code"… — the provider wins for social sign-ins. */
export function signInMethodLabel(e: Pick<SignInEvent, "method" | "provider">): string {
  if (e.provider) return e.provider.charAt(0).toUpperCase() + e.provider.slice(1);
  if (!e.method) return "Unknown";
  return METHOD_LABEL[e.method] ?? e.method.replace(/_/g, " ");
}

const COLUMNS: MatrxColumnDef<SignInEvent>[] = [
  { id: "signed_in_at", accessorKey: "signed_in_at", header: "Signed in", format: { id: "datetime" }, width: 180 },
  { id: "method", accessorFn: (r) => signInMethodLabel(r), header: "Method", filter: "select", width: 150 },
  {
    id: "device",
    accessorFn: (r) => deviceOf(r.user_agent),
    header: "Device",
    filter: "select",
    width: 180,
    cell: (r) => <span title={r.user_agent ?? undefined}>{deviceOf(r.user_agent)}</span>,
  },
  { id: "ip", accessorFn: (r) => r.ip ?? "", header: "IP", width: 140, cell: (r) => <span className="font-mono type-meta">{r.ip ?? "—"}</span> },
  { id: "aal", accessorFn: (r) => (r.aal === "aal2" ? "Two-step" : "One step"), header: "Level", filter: "select", width: 120 },
  { id: "via", accessorFn: (r) => r.oauth_client ?? "AI Matrx", header: "Through", filter: "select", width: 140 },
  {
    id: "session",
    accessorFn: (r) => (r.session_live ? "Live" : "Ended"),
    header: "Session",
    filter: "select",
    width: 110,
    cell: (r) => <Badge tone={r.session_live ? "success" : "neutral"}>{r.session_live ? "Live" : "Ended"}</Badge>,
  },
];

export function UserSignInHistory({ userId, version }: { userId: string; version: number }) {
  const [retry, setRetry] = useState(0);
  const { data: first, loading, error } = useRecordLoad(fetchSignIns, userId, version + retry);
  const [more, setMore] = useState<{ base: SignInPage; page: SignInPage } | null>(null);
  const [busy, setBusy] = useState(false);
  const [moreError, setMoreError] = useState<unknown>(null);
  // A fresh first page (person, version or retry changed) drops the pages loaded under the old one.
  const shown = more && more.base === first ? more.page : first;
  const items = shown?.items ?? [];

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!first || !last) return;
    setBusy(true);
    setMoreError(null);
    try {
      const next = await fetchSignIns(userId, last.signed_in_at);
      const seen = new Set(items.map((e) => e.id));
      setMore({ base: first, page: { items: [...items, ...next.items.filter((e) => !seen.has(e.id))], has_more: next.has_more } });
    } catch (e) {
      setMoreError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="user-sign-in-history">
      <MatrxDataTable
        data={items}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        isLoading={loading}
        read={readOf({ loading, error }, { what: "sign-in history", onRetry: () => setRetry((v) => v + 1) })}
        emptyState={{ title: "No sign-ins recorded", icon: <History className="h-6 w-6 text-muted-foreground" /> }}
        toolbar={{ search: true, searchPlaceholder: "Search sign-ins…" }}
      />
      {moreError ? (
        <ErrorNotice
          size="inline"
          message="Older sign-ins could not load."
          error={moreError instanceof Error ? moreError.message : String(moreError)}
          operation="Read sign-in history"
          calls={["admin.user_sign_ins"]}
        />
      ) : null}
      {shown?.has_more ? (
        <div className="flex justify-center border-t border-border px-3 py-2">
          <Button variant="outline" disabled={busy} onClick={loadMore}>
            {busy ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
