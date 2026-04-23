"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  FileEdit,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { useOpenFile } from "../../hooks/useOpenFile";
import { SidePanelAction, SidePanelHeader } from "../SidePanelChrome";
import { HOVER_ROW, ROW_HEIGHT } from "../../styles/tokens";

interface GitPanelProps {
  className?: string;
}

type GitStatusCode =
  | "M" // modified
  | "A" // added
  | "D" // deleted
  | "R" // renamed
  | "C" // copied
  | "U" // unmerged
  | "?" // untracked
  | "!"; // ignored

interface GitEntry {
  indexStatus: GitStatusCode;
  workTreeStatus: GitStatusCode;
  path: string;
  staged: boolean; // indexStatus !== ' ' && indexStatus !== '?'
}

export const GitPanel: React.FC<GitPanelProps> = ({ className }) => {
  const { process, filesystem } = useCodeWorkspace();
  const openFile = useOpenFile();

  const [entries, setEntries] = useState<GitEntry[] | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!process.isReady) {
      setEntries(null);
      setError("No process adapter connected — Git requires a live workspace.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [statusResult, branchResult] = await Promise.all([
        process.exec("git status --porcelain=v1", { cwd: filesystem.rootPath }),
        process.exec("git branch --show-current", { cwd: filesystem.rootPath }),
      ]);
      if (statusResult.exitCode !== 0) {
        throw new Error(
          statusResult.stderr.trim() ||
            `git status exited with ${statusResult.exitCode}`,
        );
      }
      setBranch(branchResult.stdout.trim() || null);
      setEntries(parseStatus(statusResult.stdout));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEntries(null);
    } finally {
      setLoading(false);
    }
  }, [process, filesystem.rootPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runGit = useCallback(
    async (args: string) => {
      setBusy(true);
      try {
        const result = await process.exec(`git ${args}`, {
          cwd: filesystem.rootPath,
        });
        if (result.exitCode !== 0) {
          throw new Error(
            result.stderr.trim() || `git ${args} exited ${result.exitCode}`,
          );
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [process, filesystem.rootPath, refresh],
  );

  const stage = (path: string) => runGit(`add -- ${shellQuote(path)}`);
  const unstage = (path: string) => runGit(`reset HEAD -- ${shellQuote(path)}`);
  const stageAll = () => runGit("add -A");

  const commit = async () => {
    const msg = commitMessage.trim();
    if (!msg) {
      setError("Enter a commit message first.");
      return;
    }
    await runGit(`commit -m ${shellQuote(msg)}`);
    if (!error) setCommitMessage("");
  };

  const staged = entries?.filter((e) => e.staged) ?? [];
  const unstaged = entries?.filter((e) => !e.staged) ?? [];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Source Control"
        subtitle={branch ? `on ${branch}` : undefined}
        actions={
          <>
            <SidePanelAction
              icon={Plus}
              label="Stage all"
              onClick={() => void stageAll()}
            />
            <SidePanelAction
              icon={loading ? Loader2 : RefreshCw}
              label="Refresh"
              onClick={() => void refresh()}
            />
          </>
        }
      />
      <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message (⌘+Enter to commit)"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void commit();
            }
          }}
          className="w-full resize-none rounded-sm border border-neutral-300 bg-white p-1.5 text-[12px] outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={() => void commit()}
          disabled={busy || staged.length === 0 || !commitMessage.trim()}
          className="mt-1 flex w-full items-center justify-center gap-1 rounded-sm border border-blue-400 bg-blue-500 px-2 py-1 text-[11px] text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Commit {staged.length > 0 ? `(${staged.length})` : ""}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-2 mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {entries !== null && entries.length === 0 && !error && (
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
            <GitBranch size={28} strokeWidth={1.2} />
            <p className="text-xs">Working tree is clean.</p>
          </div>
        )}
        {staged.length > 0 && (
          <GitSection
            title="Staged Changes"
            entries={staged}
            onClickEntry={openFile}
            onAction={unstage}
            actionIcon={Minus}
            actionLabel="Unstage"
          />
        )}
        {unstaged.length > 0 && (
          <GitSection
            title="Changes"
            entries={unstaged}
            onClickEntry={openFile}
            onAction={stage}
            actionIcon={Plus}
            actionLabel="Stage"
          />
        )}
      </div>
    </div>
  );
};

interface GitSectionProps {
  title: string;
  entries: GitEntry[];
  onClickEntry: (path: string) => void;
  onAction: (path: string) => Promise<void>;
  actionIcon: React.ComponentType<{ size?: number }>;
  actionLabel: string;
}

const GitSection: React.FC<GitSectionProps> = ({
  title,
  entries,
  onClickEntry,
  onAction,
  actionIcon: ActionIcon,
  actionLabel,
}) => (
  <div className="pb-2">
    <div className="sticky top-0 z-[1] flex items-center justify-between bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
      <span>{title}</span>
      <span>{entries.length}</span>
    </div>
    {entries.map((entry) => (
      <div
        key={entry.path}
        className={cn(
          "group flex items-center gap-1 px-2 text-[12px]",
          ROW_HEIGHT,
          HOVER_ROW,
        )}
      >
        <button
          type="button"
          onClick={() => onClickEntry(entry.path)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <StatusDot
            status={entry.staged ? entry.indexStatus : entry.workTreeStatus}
          />
          <span className="truncate">{entry.path}</span>
        </button>
        <button
          type="button"
          aria-label={actionLabel}
          title={actionLabel}
          onClick={() => void onAction(entry.path)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-neutral-500 opacity-0 transition-opacity hover:bg-neutral-200 hover:text-neutral-900 group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <ActionIcon size={12} />
        </button>
      </div>
    ))}
  </div>
);

function StatusDot({ status }: { status: GitStatusCode }) {
  const map: Record<string, { label: string; color: string }> = {
    M: { label: "M", color: "text-amber-500" },
    A: { label: "A", color: "text-green-600" },
    D: { label: "D", color: "text-red-500" },
    R: { label: "R", color: "text-blue-500" },
    C: { label: "C", color: "text-blue-500" },
    U: { label: "U", color: "text-purple-500" },
    "?": { label: "U", color: "text-emerald-500" },
    "!": { label: "I", color: "text-neutral-500" },
  };
  const entry = map[status] ?? { label: status, color: "text-neutral-400" };
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold",
        entry.color,
      )}
    >
      {entry.label}
    </span>
  );
}

function parseStatus(output: string): GitEntry[] {
  const entries: GitEntry[] = [];
  for (const rawLine of output.split("\n")) {
    if (!rawLine) continue;
    const indexStatus = (rawLine[0] ?? " ") as GitStatusCode;
    const workTreeStatus = (rawLine[1] ?? " ") as GitStatusCode;
    const path = rawLine.slice(3);
    if (!path) continue;
    const staged =
      indexStatus !== (" " as GitStatusCode) && indexStatus !== "?";
    entries.push({
      indexStatus: indexStatus === (" " as GitStatusCode) ? "M" : indexStatus,
      workTreeStatus:
        workTreeStatus === (" " as GitStatusCode) ? "M" : workTreeStatus,
      path,
      staged,
    });
  }
  return entries;
}

function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}
