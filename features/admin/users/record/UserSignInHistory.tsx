"use client";

// A person's sign-in history — the Security tab's "Sign-in history" section. ONE read:
// admin.user_sign_ins_page (migration 20261022160100), which pages
// iam.sign_in_event newest first on a (time, id) cursor. Every sign-in since 2026-10-21 is
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
import { SIGN_IN_PAGE, appendSignInPage, cursorAfter, deviceOf, type SignInCursor, type SignInEvent, type SignInPage } from "./signInPaging";

export { deviceOf };
export type { SignInEvent, SignInPage };

export async function fetchSignIns(userId: string, cursor: SignInCursor | null = null): Promise<SignInPage> {
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("user_sign_ins_page", {
      p_user: userId,
      p_limit: SIGN_IN_PAGE,
      ...(cursor ? { p_before: cursor.before, p_before_id: cursor.beforeId } : {}),
    });
  if (error) throw new Error(error.message);
  if (!isJsonObject(data) || !Array.isArray(data.items) || typeof data.has_more !== "boolean") {
    throw new Error("admin.user_sign_ins_page returned an unexpected shape");
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
    const cursor = cursorAfter(items);
    if (!first || !cursor || !shown) return;
    setBusy(true);
    setMoreError(null);
    try {
      const next = await fetchSignIns(userId, cursor);
      setMore({ base: first, page: appendSignInPage(shown, next) });
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
          calls={["admin.user_sign_ins_page"]}
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
