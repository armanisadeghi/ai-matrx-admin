"use client";

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { extractErrorMessage } from "@/utils/errors";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Network,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveSandboxId } from "../redux/codeWorkspaceSlice";
import { LiteTable, type MatrxColumnDef } from "@ai-matrx/design-system/lite-table";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface PortsTabProps {
  className?: string;
}

interface PortEntry {
  port: number;
  proto?: string;
  pid?: number;
  process?: string;
  command?: string;
  host?: string;
  preview_url?: string | null;
}

interface PortsResponse {
  ports?: PortEntry[];
}

const POLL_INTERVAL_MS = 5000;

export const PortsTab: React.FC<PortsTabProps> = ({ className }) => {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const activeSandboxId = useAppSelector(selectActiveSandboxId);
  const [ports, setPorts] = useState<PortEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const fetchPorts = useCallback(async () => {
    if (!activeSandboxId) {
      setPorts(null);
      return;
    }
    inflight.current?.abort();
    const ctl = new AbortController();
    inflight.current = ctl;
    setLoading(true);
    try {
      const resp = await fetch(`/api/sandbox/${activeSandboxId}/ports`, {
        signal: ctl.signal,
      });
      if (!resp.ok) {
        const message = `Unable to load sandbox ports (${resp.status}). Retry or check sandbox status.`;
        captureError({ source: "api-http", relation: "GET /api/sandbox/:id/ports", code: "sandbox_ports_http_error", message, userMessage: message, status: resp.status });
        throw new Error(message);
      }
      const data = (await resp.json()) as PortsResponse;
      setPorts(data.ports ?? []);
      setError(null);
    } catch (err) {
      if (ctl.signal.aborted) return;
      setError(extractErrorMessage(err));
    } finally {
      if (!ctl.signal.aborted) setLoading(false);
    }
  }, [activeSandboxId]);

  useEffect(() => {
    if (!activeSandboxId) {
      setPorts(null);
      return undefined;
    }
    void fetchPorts();
    const tick = () => {
      void fetchPorts().finally(() => {
        timer.current = setTimeout(tick, POLL_INTERVAL_MS);
      });
    };
    timer.current = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      inflight.current?.abort();
    };
  }, [activeSandboxId, fetchPorts]);

  const copy = useCallback((key: string, text: string) => {
    void copyText(text).then((copied) => {
      if (!copied) return;
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur));
      }, 1500);
    });
  }, []);

  if (!activeSandboxId) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center bg-white text-neutral-500 dark:bg-[#181818] dark:text-neutral-400",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Network size={28} strokeWidth={1.2} />
          {/* read-gate-exempt: says no sandbox is SELECTED (client state); the ports read below runs only once one is */}
          <p className="text-xs">No sandbox connected.</p>
        </div>
      </div>
    );
  }

  const hostportOf = (entry: PortEntry) => (entry.host ? `${entry.host}:${entry.port}` : `localhost:${entry.port}`);
  const portColumns: MatrxColumnDef<PortEntry & { key: string }>[] = [
    {
      accessorKey: "port",
      header: "Port",
      cell: (entry) => (
        <span className="font-mono">
          {entry.port}
          {entry.proto && <span className="ml-1 text-[10px] uppercase text-neutral-500">{entry.proto}</span>}
        </span>
      ),
    },
    {
      id: "process",
      header: "Process",
      accessorFn: (entry) => entry.process ?? entry.command ?? "",
      cell: (entry) => (
        <span className="text-neutral-600 dark:text-neutral-300">
          {entry.process ?? entry.command ?? "—"}
          {entry.pid && <span className="ml-1 text-[10px] text-neutral-500">#{entry.pid}</span>}
        </span>
      ),
    },
    { id: "address", header: "Address", accessorFn: hostportOf, className: "font-mono text-neutral-500 sm:truncate" },
    {
      id: "actions",
      header: "",
      label: "Actions",
      sortable: false,
      align: "right",
      cell: (entry) => {
        const hostport = hostportOf(entry);
        const previewUrl = entry.preview_url ?? null;
        return (
          <div className="inline-flex gap-0.5">
            <button
              type="button"
              aria-label="Copy host:port"
              title="Copy host:port"
              onClick={() => copy(`${entry.key}:hp`, hostport)}
              className="flex h-5 w-5 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
            >
              {copiedKey === `${entry.key}:hp` ? <Check size={12} /> : <Copy size={12} />}
            </button>
            {previewUrl && (
              <OutboundLink
                href={previewUrl}
                aria-label="Open preview URL"
                title="Open preview URL"
                className="flex h-5 w-5 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              >
                <ExternalLink size={12} />
              </OutboundLink>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white text-[12px] dark:bg-[#181818]",
        className,
      )}
    >
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-neutral-200 px-2 dark:border-neutral-800">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <Network size={12} />
          <span>
            {error ? "Port status unavailable" : ports === null ? "Checking listening ports…" : `${ports.length} listening port${ports.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          title="Refresh"
          onClick={() => void fetchPorts()}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
        </button>
      </div>
      {error && (
        <div className="mx-2 mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
          <ErrorAlchemyMenu error={error} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {ports && ports.length === 0 && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-neutral-500 dark:text-neutral-400">
            <Network size={28} strokeWidth={1.2} />
            <p className="text-xs">No forwarded ports.</p>
            <p className="text-[11px] text-neutral-400">
              Exposed sandbox ports will appear here. Public preview URLs are
              not yet wired up — copy the host:port value to use over SSH.
            </p>
          </div>
        )}
        {ports && ports.length > 0 && (
          <LiteTable
            data={ports.map((entry, idx) => ({ ...entry, key: `${entry.port}:${idx}` }))}
            columns={portColumns}
            getRowId={(row) => row.key}
            density="condensed"
            copyRows={false}
            mobile="scroll"
            ariaLabel="Forwarded ports"
          />
        )}
      </div>
    </div>
  );
};
