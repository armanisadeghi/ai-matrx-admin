"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  ExternalLink,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  Server,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { SandboxInstance, SandboxStatus } from "@/types/sandbox";
import { ACTIVE_SANDBOX_STATUSES } from "@/types/sandbox";
import { MockFilesystemAdapter } from "../../adapters/MockFilesystemAdapter";
import {
  MockProcessAdapter,
  SandboxProcessAdapter,
} from "../../adapters/SandboxProcessAdapter";
import { SandboxFilesystemAdapter } from "../../adapters/SandboxFilesystemAdapter";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import {
  selectActiveSandboxId,
  setActiveSandboxId,
} from "../../redux/codeWorkspaceSlice";
import { SidePanelAction, SidePanelHeader } from "../SidePanelChrome";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  PANE_BORDER,
  ROW_HEIGHT,
} from "../../styles/tokens";

interface SandboxesPanelProps {
  className?: string;
}

const POLL_INTERVAL_MS = 4000;
const POLL_STATUSES = new Set<SandboxStatus>(["creating", "starting"]);

export const SandboxesPanel: React.FC<SandboxesPanelProps> = ({
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector(selectActiveSandboxId);
  const { setFilesystem, setProcess } = useCodeWorkspace();

  const [instances, setInstances] = useState<SandboxInstance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/sandbox");
      if (!resp.ok)
        throw new Error(`Failed to list sandboxes (${resp.status})`);
      const data = await resp.json();
      setInstances((data.instances ?? []) as SandboxInstance[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while any instance is creating/starting.
  useEffect(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    if (!instances) return;
    const needsPoll = instances.some((i) => POLL_STATUSES.has(i.status));
    if (!needsPoll) return;
    pollTimer.current = setTimeout(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [instances, refresh]);

  const connect = useCallback(
    (instance: SandboxInstance) => {
      if (!ACTIVE_SANDBOX_STATUSES.includes(instance.status)) {
        setError(
          `Sandbox ${instance.id} is ${instance.status} — it must be starting/ready/running to connect.`,
        );
        return;
      }
      dispatch(setActiveSandboxId(instance.id));
      const label = instance.sandbox_id
        ? instance.sandbox_id.slice(0, 10)
        : instance.id.slice(0, 8);
      const rootPath = instance.hot_path || "/home/agent";
      setFilesystem(
        new SandboxFilesystemAdapter(instance.id, `Sandbox ${label}`, rootPath),
      );
      setProcess(new SandboxProcessAdapter(instance.id, rootPath));
    },
    [dispatch, setFilesystem, setProcess],
  );

  const disconnect = useCallback(() => {
    dispatch(setActiveSandboxId(null));
    setFilesystem(new MockFilesystemAdapter());
    setProcess(new MockProcessAdapter());
  }, [dispatch, setFilesystem, setProcess]);

  const createSandbox = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const resp = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error ?? `Create failed (${resp.status})`);
      }
      await refresh();
      if (data.instance) {
        // Auto-connect once it reaches ready.
        const created = data.instance as SandboxInstance;
        dispatch(setActiveSandboxId(created.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [dispatch, refresh]);

  const stopSandbox = useCallback(
    async (instance: SandboxInstance) => {
      setBusyId(instance.id);
      setError(null);
      try {
        const resp = await fetch(`/api/sandbox/${instance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.error ?? `Stop failed (${resp.status})`);
        }
        if (activeId === instance.id) disconnect();
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [activeId, disconnect, refresh],
  );

  const deleteSandbox = useCallback(
    async (instance: SandboxInstance) => {
      const confirmed = window.confirm(
        `Delete sandbox ${instance.sandbox_id?.slice(0, 10) ?? instance.id.slice(0, 8)}?`,
      );
      if (!confirmed) return;
      setBusyId(instance.id);
      setError(null);
      try {
        const resp = await fetch(`/api/sandbox/${instance.id}`, {
          method: "DELETE",
        });
        if (!resp.ok && resp.status !== 204) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.error ?? `Delete failed (${resp.status})`);
        }
        if (activeId === instance.id) disconnect();
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [activeId, disconnect, refresh],
  );

  const extendSandbox = useCallback(
    async (instance: SandboxInstance) => {
      setBusyId(instance.id);
      setError(null);
      try {
        const resp = await fetch(`/api/sandbox/${instance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "extend", ttl_seconds: 3600 }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          throw new Error(data?.error ?? `Extend failed (${resp.status})`);
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const activeInstance = instances?.find((i) => i.id === activeId);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Sandboxes"
        subtitle={
          instances
            ? `${instances.length} instance${instances.length === 1 ? "" : "s"}`
            : undefined
        }
        actions={
          <>
            <SidePanelAction
              icon={creating ? Loader2 : Plus}
              label="New sandbox"
              onClick={() => void createSandbox()}
            />
            <SidePanelAction
              icon={loading ? Loader2 : RefreshCw}
              label="Refresh"
              onClick={() => void refresh()}
            />
          </>
        }
      />
      {activeInstance && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px]",
            PANE_BORDER,
            "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Plug size={12} />
            <span className="truncate font-mono">
              {activeInstance.sandbox_id?.slice(0, 14) ??
                activeInstance.id.slice(0, 8)}
            </span>
            <span className="opacity-70">connected</span>
          </div>
          <button
            type="button"
            onClick={disconnect}
            className="text-[10px] uppercase tracking-wide text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
          >
            Disconnect
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        {error && (
          <div className="mx-3 mb-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {loading && instances === null && (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-neutral-500">
            <Loader2 size={12} className="animate-spin" />
            Loading…
          </div>
        )}
        {instances?.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
            <Server size={32} strokeWidth={1.2} />
            <p className="text-xs">No sandboxes yet.</p>
            <button
              type="button"
              onClick={() => void createSandbox()}
              disabled={creating}
              className="flex items-center gap-1 rounded border border-blue-400 bg-blue-500 px-2 py-1 text-[11px] text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              Create sandbox
            </button>
          </div>
        )}
        {instances?.map((instance) => (
          <SandboxRow
            key={instance.id}
            instance={instance}
            isActive={activeId === instance.id}
            isExpanded={expandedId === instance.id}
            busy={busyId === instance.id}
            onToggle={() =>
              setExpandedId((cur) => (cur === instance.id ? null : instance.id))
            }
            onConnect={() => connect(instance)}
            onStop={() => void stopSandbox(instance)}
            onExtend={() => void extendSandbox(instance)}
            onDelete={() => void deleteSandbox(instance)}
          />
        ))}
      </div>
    </div>
  );
};

interface SandboxRowProps {
  instance: SandboxInstance;
  isActive: boolean;
  isExpanded: boolean;
  busy: boolean;
  onToggle: () => void;
  onConnect: () => void;
  onStop: () => void;
  onExtend: () => void;
  onDelete: () => void;
}

const SandboxRow: React.FC<SandboxRowProps> = ({
  instance,
  isActive,
  isExpanded,
  busy,
  onToggle,
  onConnect,
  onStop,
  onExtend,
  onDelete,
}) => {
  const canConnect = ACTIVE_SANDBOX_STATUSES.includes(instance.status);
  const canStop = ["ready", "running", "starting"].includes(instance.status);
  const canExtend = ["ready", "running"].includes(instance.status);
  const ttl = formatTtl(instance.expires_at);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 text-left text-[12px]",
          ROW_HEIGHT,
          HOVER_ROW,
          isActive && ACTIVE_ROW,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Server
            size={14}
            className={cn(
              "shrink-0",
              isActive
                ? "text-blue-500"
                : "text-neutral-500 dark:text-neutral-400",
            )}
          />
          <span className="truncate font-mono">
            {instance.sandbox_id?.slice(0, 14) ?? instance.id.slice(0, 8)}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-[1px] text-[10px] uppercase tracking-wide",
            statusClasses(instance.status),
          )}
        >
          {instance.status}
        </span>
      </button>
      {isExpanded && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] dark:border-neutral-800 dark:bg-neutral-900/60">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-neutral-600 dark:text-neutral-400">
            <dt className="text-neutral-500">ID</dt>
            <dd className="truncate">{instance.id}</dd>
            <dt className="text-neutral-500">Path</dt>
            <dd className="truncate">{instance.hot_path ?? "—"}</dd>
            {ttl && (
              <>
                <dt className="text-neutral-500">TTL</dt>
                <dd className="flex items-center gap-1">
                  <Clock size={10} /> {ttl}
                </dd>
              </>
            )}
            <dt className="text-neutral-500">Created</dt>
            <dd>{formatDate(instance.created_at)}</dd>
          </dl>
          <div className="mt-2 flex flex-wrap gap-1">
            <ActionButton
              icon={Plug}
              label="Connect"
              onClick={onConnect}
              disabled={!canConnect || busy}
              primary={canConnect}
            />
            <ActionButton
              icon={Timer}
              label="+1h TTL"
              onClick={onExtend}
              disabled={!canExtend || busy}
            />
            <ActionButton
              icon={Square}
              label="Stop"
              onClick={onStop}
              disabled={!canStop || busy}
            />
            <ActionButton
              icon={Trash2}
              label="Delete"
              onClick={onDelete}
              disabled={busy}
              danger
            />
            <a
              href={`/sandbox/${instance.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ExternalLink size={10} />
              Open detail
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-50",
        primary &&
          "border-blue-400 bg-blue-500 text-white hover:bg-blue-600 disabled:hover:bg-blue-500",
        danger &&
          "border-red-400 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40",
        !primary &&
          !danger &&
          "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
      )}
    >
      <Icon size={10} />
      {label}
    </button>
  );
}

function statusClasses(status: SandboxStatus): string {
  switch (status) {
    case "ready":
    case "running":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case "starting":
    case "creating":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "stopped":
    case "shutting_down":
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
    case "expired":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

function formatTtl(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
