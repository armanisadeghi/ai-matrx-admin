"use client";

import { Fact } from "@/features/ai-work/components/connections/Fact";
import { ProInput } from "@/components/official/ProInput";

/**
 * Cursor accounts — the person's connected Cursor API keys, any number.
 *
 * Connect: paste a key from the Cursor Dashboard; the server checks it with
 * Cursor and keeps it only in the Vault (`features/ai-work/lib/cursorAccounts.ts`).
 * The server then delivers agent mail into the person's Cursor cloud agents.
 * The pasted key is component-local state only, cleared the moment it is sent.
 *
 * Behind "Use in Cursor": how a Cursor cloud agent joins (add it to a room on
 * /work/live) and how it sends (the AI Matrx MCP in Cursor's own settings).
 */

import { useEffect, useState } from "react";
import { ExternalLink, Info, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Input } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import { CloudSetupDialog } from "@/features/ai-work/components/connections/CloudSetupDialog";
import { toast } from "@/lib/toast";
import { resolveBaseUrl } from "@/lib/python-client";
import {
  CURSOR_DASHBOARD_URL,
  connectCursorKey,
  cursorErrorMessage,
  disconnectCursorKey,
  readCursorAccounts,
  type CursorAccountRow,
} from "@/features/ai-work/lib/cursorAccounts";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  needs_attention: "Key refused — connect it again",
  disconnected: "Disconnected",
};

export function CursorAccountsPanel() {
  const [rows, setRows] = useState<CursorAccountRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const mcpUrl = `${resolveBaseUrl().replace(/\/$/, "")}/api/matrx-mcp`;

  const load = () =>
    readCursorAccounts().then(
      (next) => {
        setLoadError(null);
        setRows(next);
      },
      (cause: unknown) => {
        setRows([]);
        setLoadError(cursorErrorMessage(cause, "Your Cursor accounts did not load."));
      },
    );
  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    const typed = key.trim();
    if (!typed) return;
    setKey("");
    setBusy("connect");
    setRefusal(null);
    try {
      const out = await connectCursorKey(typed, label);
      toast.success(`Cursor account connected: ${out.label}`);
      setOpen(false);
      setLabel("");
      void load();
    } catch (cause) {
      setRefusal(cursorErrorMessage(cause, "Cursor did not accept this key."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: CursorAccountRow) => {
    setBusy(`rm:${row.id}`);
    try {
      await disconnectCursorKey(row.id);
      void load();
    } catch (cause) {
      toast.error(cursorErrorMessage(cause, "Could not disconnect this key."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section id="cursor-accounts" className="space-y-2">
      {open && (
        <form
          className="space-y-2 rounded-lg border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Button asChild variant="quiet">
            <OutboundLink href={CURSOR_DASHBOARD_URL}>
              <ExternalLink className="size-3.5" />
              Create a key in Cursor
            </OutboundLink>
          </Button>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your Cursor API key"
            autoComplete="off"
            aria-label="Cursor API key"
          />
          <ProInput
            enableVoice={false}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name (optional)"
            autoComplete="off"
            aria-label="Name for this key"
          />
          {refusal && <ErrorNotice message={refusal} size="inline" />}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              icon={busy === "connect" ? <Loader2 className="animate-spin" /> : <KeyRound />}
              disabled={busy !== null || !key.trim()}
            >
              {busy === "connect" ? "Checking with Cursor…" : "Connect"}
            </Button>
            <Button
              type="button"
              variant="quiet"
              icon={<X />}
              aria-label="Cancel"
              onClick={() => {
                setOpen(false);
                setKey("");
                setRefusal(null);
              }}
              disabled={busy !== null}
            />
          </div>
        </form>
      )}

      <MatrxDataTable<CursorAccountRow>
        tableId="work/connections/cursor-cloud"
        data={rows ?? []}
        columns={CURSOR_COLUMNS}
        getRowId={(row) => row.id}
        pageSize={0}
        density="condensed"
        viewTabs={false}
        selection={false}
        defaultSort={{ id: "account", direction: "asc" }}
        toolbar={{
          title: "Cursor cloud accounts",
          searchPlaceholder: "Search Cursor accounts",
          refresh: { onRefresh: load, label: "Read Cursor accounts again" },
          actions: (
            <>
              <Button variant="quiet" onClick={() => setSetupOpen(true)}>
                Use in Cursor
              </Button>
              <Button
                variant="outline"
                icon={<Plus />}
                onClick={() => {
                  setOpen(true);
                  setRefusal(null);
                }}
                disabled={busy !== null || open}
                title="Paste a Cursor API key so messages reach your Cursor cloud agents"
              >
                Connect
              </Button>
            </>
          ),
        }}
        rowActions={(row, controls) => [
          {
            id: "disconnect",
            icon: Trash2,
            label: `Disconnect ${row.label}`,
            onClick: () => void remove(row),
            disabled: busy !== null,
            loading: busy === `rm:${row.id}`,
          },
          { id: "info", icon: Info, label: `Everything about ${row.label}`, onClick: controls.openDetail },
        ]}
        detail={{
          title: (row) => row.label,
          description: () => "Cursor cloud account",
          render: (row) => (
            <div className="space-y-3 p-1">
              <Fact label="Account" value={row.label} />
              <Fact label="Status" value={STATUS_LABEL[row.status] ?? row.status} />
              <Fact label="Connection id" value={row.id} mono />
              <Fact label="Used for" value="Delivering messages to your Cursor cloud agents" />
            </div>
          ),
        }}
        isLoading={rows === null}
        read={{ status: rows === null ? "loading" : loadError ? "error" : "ready", error: loadError ?? undefined, onRetry: () => void load(), what: "your Cursor accounts" }}
        emptyState={{ title: "No Cursor account connected" }}
      />

      <CloudSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        title="Use AI Matrx in Cursor cloud agents"
        description="So a Cursor cloud agent can join rooms and send messages."
        steps={["In Cursor, add an MCP server with the address below, then sign in.", "On Live, open a room and use + Cursor agent to add one of your agents."]}
        url={mcpUrl}
        what="MCP URL"
      />
    </section>
  );
}

const CURSOR_COLUMNS: MatrxColumnDef<CursorAccountRow>[] = [
  { id: "account", header: "Account", accessorFn: (row) => row.label, filter: "text", width: 280 },
  { id: "status", header: "Status", accessorFn: (row) => STATUS_LABEL[row.status] ?? row.status, filter: "select", width: 240 },
];
