"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  SandboxFilesystemAdapter,
  SandboxProcessAdapter,
  MockFilesystemAdapter,
  MockProcessAdapter,
} from "../../adapters";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { selectActiveSandboxId, setActiveSandboxId } from "../../redux";
import { SidePanelAction, SidePanelHeader } from "../SidePanelChrome";
import { ACTIVE_ROW, HOVER_ROW, ROW_HEIGHT } from "../../styles/tokens";

interface SandboxInstance {
  id: string;
  sandbox_id?: string;
  status: string;
  project_id?: string | null;
  hot_path?: string | null;
  created_at: string;
}

interface SandboxesPanelProps {
  className?: string;
}

export const SandboxesPanel: React.FC<SandboxesPanelProps> = ({
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector(selectActiveSandboxId);
  const { setFilesystem, setProcess } = useCodeWorkspace();

  const [instances, setInstances] = useState<SandboxInstance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/sandbox");
      if (!resp.ok) {
        throw new Error(`Failed to list sandboxes (${resp.status})`);
      }
      const data = await resp.json();
      setInstances(data.instances ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelect = (instance: SandboxInstance) => {
    if (!["ready", "running"].includes(instance.status)) {
      setError(
        `Sandbox ${instance.id} is ${instance.status} — can't connect until it's ready or running.`,
      );
      return;
    }
    dispatch(setActiveSandboxId(instance.id));
    const label = instance.sandbox_id
      ? instance.sandbox_id.slice(0, 10)
      : instance.id.slice(0, 8);
    setFilesystem(
      new SandboxFilesystemAdapter(instance.id, `Sandbox ${label}`),
    );
    setProcess(
      new SandboxProcessAdapter(instance.id, instance.hot_path ?? undefined),
    );
  };

  const handleDisconnect = () => {
    dispatch(setActiveSandboxId(null));
    setFilesystem(new MockFilesystemAdapter());
    setProcess(new MockProcessAdapter());
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Sandboxes"
        actions={
          <SidePanelAction
            icon={RefreshCw}
            label="Refresh"
            onClick={() => void refresh()}
          />
        }
      />
      <div className="flex flex-col gap-1 overflow-y-auto py-1">
        {error && (
          <div className="px-3 py-1 text-[11px] text-red-500">{error}</div>
        )}
        {loading && instances === null && (
          <div className="px-3 py-1 text-[11px] text-neutral-500">
            Loading\u2026
          </div>
        )}
        {instances?.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
            <Server size={32} strokeWidth={1.2} />
            <p className="text-xs">
              No active sandboxes. Create one from the Sandbox route.
            </p>
          </div>
        )}
        {instances?.map((instance) => {
          const isActive = activeId === instance.id;
          return (
            <button
              key={instance.id}
              type="button"
              onClick={() => handleSelect(instance)}
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
                  {instance.sandbox_id ?? instance.id.slice(0, 10)}
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
          );
        })}
        {activeId && (
          <div className="mt-3 border-t border-neutral-200 pt-2 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full px-3 text-left text-[12px] text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-50"
            >
              Disconnect \u2014 use mock project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function statusClasses(status: string): string {
  switch (status) {
    case "ready":
    case "running":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case "starting":
    case "creating":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
    case "stopped":
    case "expired":
      return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  }
}
