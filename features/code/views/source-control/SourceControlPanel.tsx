"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  GitBranch,
  KeyRound,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectActiveSandboxId } from "../../redux/codeWorkspaceSlice";
import { openTab } from "../../redux/tabsSlice";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { SidePanelAction, SidePanelHeader } from "../SidePanelChrome";
import { HOVER_ROW, ROW_HEIGHT } from "../../styles/tokens";
import {
  SandboxGitAdapter,
  type GitFileChange,
  type GitStatusResponse,
} from "../../adapters/SandboxGitAdapter";
import { CredentialsModal } from "./CredentialsModal";

interface SourceControlPanelProps {
  className?: string;
}

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
  className,
}) => {
  const dispatch = useAppDispatch();
  const activeSandboxId = useAppSelector(selectActiveSandboxId);
  const { filesystem } = useCodeWorkspace();

  const cwd = filesystem.rootPath || "/home/agent";
  const adapter = useMemo(
    () => (activeSandboxId ? new SandboxGitAdapter({ instanceId: activeSandboxId }) : null),
    [activeSandboxId],
  );

  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [collapsed, setCollapsed] = useState({
    staged: false,
    unstaged: false,
    untracked: false,
  });

  // ── Refresh ─────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!adapter) {
      setStatus(null);
      setError("No sandbox connected — Source Control needs an active sandbox.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await adapter.status({ cwd });
      setStatus(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [adapter, cwd]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const wrap = useCallback(
    async (action: () => Promise<unknown>, busyMessage?: string) => {
      if (!adapter) return;
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (err) {
        setError(
          (busyMessage ? `${busyMessage}: ` : "") +
            (err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setBusy(false);
      }
    },
    [adapter, refresh],
  );

  const stage = useCallback(
    (paths: string[]) => wrap(() => adapter!.add({ cwd, paths }), "stage"),
    [adapter, cwd, wrap],
  );
  const stageAll = useCallback(() => stage(["."]), [stage]);
  const unstage = useCallback(
    (path: string) =>
      wrap(
        () => adapter!.add({ cwd, paths: [`:!${path}`] }), // negative pathspec = unstage
        "unstage",
      ),
    [adapter, cwd, wrap],
  );

  const commit = useCallback(async () => {
    const msg = commitMessage.trim();
    if (!msg) {
      setError("Enter a commit message first.");
      return;
    }
    if (!adapter) return;
    await wrap(async () => {
      await adapter.commit({ cwd, message: msg });
      setCommitMessage("");
    }, "commit");
  }, [adapter, cwd, commitMessage, wrap]);

  const push = useCallback(
    () => wrap(() => adapter!.push({ cwd }), "push"),
    [adapter, cwd, wrap],
  );
  const pull = useCallback(
    () => wrap(() => adapter!.pull({ cwd }), "pull"),
    [adapter, cwd, wrap],
  );
  const commitAndPush = useCallback(async () => {
    await commit();
    if (!error) await push();
  }, [commit, push, error]);

  // ── Diff preview ────────────────────────────────────────────────────────
  const openDiff = useCallback(
    async (path: string, staged: boolean) => {
      if (!adapter) return;
      try {
        const diff = await adapter.diff({ cwd, path, staged });
        const tabId = `git-diff:${activeSandboxId}:${staged ? "staged" : "working"}:${path}`;
        const text = diff.text || "(no diff)";
        dispatch(
          openTab({
            id: tabId,
            path: `git-diff://${path}${staged ? "?staged" : ""}`,
            name: `Δ ${path.split("/").pop() ?? path}`,
            language: "diff",
            content: text,
            pristineContent: text,
            dirty: false,
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [adapter, cwd, activeSandboxId, dispatch],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  const stagedCount = status?.staged.length ?? 0;
  const unstagedCount = status?.unstaged.length ?? 0;
  const untrackedCount = status?.untracked.length ?? 0;
  const conflictCount = status?.conflicted.length ?? 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Source Control"
        subtitle={
          status
            ? `${status.branch}${status.ahead ? ` ↑${status.ahead}` : ""}${
                status.behind ? ` ↓${status.behind}` : ""
              }`
            : undefined
        }
        actions={
          <>
            <SidePanelAction
              icon={KeyRound}
              label="Manage credentials"
              onClick={() => setShowCredentials(true)}
            />
            <SidePanelAction
              icon={ArrowDownToLine}
              label="Pull"
              onClick={() => void pull()}
            />
            <SidePanelAction
              icon={ArrowUpFromLine}
              label="Push"
              onClick={() => void push()}
            />
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
          placeholder="Commit message (⌘+Enter to commit, ⌘+⇧+Enter to commit & push)"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) void commitAndPush();
              else void commit();
            }
          }}
          className="w-full resize-none rounded-sm border border-neutral-300 bg-white p-1.5 text-[12px] outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={() => void commit()}
            disabled={busy || stagedCount === 0 || !commitMessage.trim()}
            className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-blue-400 bg-blue-500 px-2 py-1 text-[11px] text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Commit{stagedCount > 0 ? ` (${stagedCount})` : ""}
          </button>
          <button
            type="button"
            onClick={() => void commitAndPush()}
            disabled={busy || stagedCount === 0 || !commitMessage.trim()}
            className="flex items-center justify-center gap-1 rounded-sm border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            title="Commit & push"
          >
            <ArrowUpFromLine size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-2 mt-2 flex items-start gap-1.5 rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <CircleAlert size={12} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}
        {status &&
          status.staged.length === 0 &&
          status.unstaged.length === 0 &&
          status.untracked.length === 0 &&
          status.conflicted.length === 0 &&
          !error && (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
              <GitBranch size={28} strokeWidth={1.2} />
              <p className="text-xs">Working tree is clean.</p>
            </div>
          )}
        {conflictCount > 0 && (
          <Section
            title="Merge Conflicts"
            count={conflictCount}
            collapsed={false}
            onToggle={() => {}}
            tone="danger"
          >
            {status!.conflicted.map((path) => (
              <ChangeRow
                key={`c:${path}`}
                path={path}
                status="U"
                onClickEntry={() => void openDiff(path, false)}
                onPrimary={() => stage([path])}
                primaryIcon={Plus}
                primaryLabel="Stage"
              />
            ))}
          </Section>
        )}
        {stagedCount > 0 && (
          <Section
            title="Staged Changes"
            count={stagedCount}
            collapsed={collapsed.staged}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, staged: !prev.staged }))
            }
          >
            {status!.staged.map((entry: GitFileChange) => (
              <ChangeRow
                key={`s:${entry.path}`}
                path={entry.path}
                status={entry.status}
                onClickEntry={() => void openDiff(entry.path, true)}
                onPrimary={() => unstage(entry.path)}
                primaryIcon={Minus}
                primaryLabel="Unstage"
              />
            ))}
          </Section>
        )}
        {unstagedCount > 0 && (
          <Section
            title="Changes"
            count={unstagedCount}
            collapsed={collapsed.unstaged}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, unstaged: !prev.unstaged }))
            }
          >
            {status!.unstaged.map((entry: GitFileChange) => (
              <ChangeRow
                key={`u:${entry.path}`}
                path={entry.path}
                status={entry.status}
                onClickEntry={() => void openDiff(entry.path, false)}
                onPrimary={() => stage([entry.path])}
                primaryIcon={Plus}
                primaryLabel="Stage"
              />
            ))}
          </Section>
        )}
        {untrackedCount > 0 && (
          <Section
            title="Untracked"
            count={untrackedCount}
            collapsed={collapsed.untracked}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, untracked: !prev.untracked }))
            }
          >
            {status!.untracked.map((path: string) => (
              <ChangeRow
                key={`?:${path}`}
                path={path}
                status="??"
                onClickEntry={() => void openDiff(path, false)}
                onPrimary={() => stage([path])}
                primaryIcon={Plus}
                primaryLabel="Stage"
              />
            ))}
          </Section>
        )}
      </div>
      {showCredentials && adapter && (
        <CredentialsModal
          adapter={adapter}
          onClose={() => setShowCredentials(false)}
        />
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  count,
  collapsed,
  onToggle,
  tone = "default",
  children,
}) => (
  <div className="pb-2">
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "sticky top-0 z-[1] flex w-full items-center gap-1 bg-white px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide dark:bg-neutral-950",
        tone === "danger"
          ? "text-red-600 dark:text-red-400"
          : "text-neutral-500 dark:text-neutral-400",
      )}
    >
      {collapsed ? (
        <ChevronRight size={10} />
      ) : (
        <ChevronDown size={10} />
      )}
      <span className="flex-1">{title}</span>
      <span>{count}</span>
    </button>
    {!collapsed && children}
  </div>
);

interface ChangeRowProps {
  path: string;
  status: string;
  onClickEntry: () => void;
  onPrimary: () => void;
  primaryIcon: React.ComponentType<{ size?: number }>;
  primaryLabel: string;
}

const ChangeRow: React.FC<ChangeRowProps> = ({
  path,
  status,
  onClickEntry,
  onPrimary,
  primaryIcon: PrimaryIcon,
  primaryLabel,
}) => (
  <div
    className={cn(
      "group flex items-center gap-1 px-2 text-[12px]",
      ROW_HEIGHT,
      HOVER_ROW,
    )}
  >
    <button
      type="button"
      onClick={onClickEntry}
      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
    >
      <StatusBadge status={status} />
      <span className="truncate">{path}</span>
    </button>
    <button
      type="button"
      aria-label={primaryLabel}
      title={primaryLabel}
      onClick={onPrimary}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-neutral-500 opacity-0 transition-opacity hover:bg-neutral-200 hover:text-neutral-900 group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <PrimaryIcon size={12} />
    </button>
  </div>
);

function StatusBadge({ status }: { status: string }) {
  const code = status.trim().slice(0, 1) || status.slice(0, 2);
  const map: Record<string, { label: string; color: string }> = {
    M: { label: "M", color: "text-amber-500" },
    A: { label: "A", color: "text-green-600" },
    D: { label: "D", color: "text-red-500" },
    R: { label: "R", color: "text-blue-500" },
    C: { label: "C", color: "text-blue-500" },
    U: { label: "U", color: "text-purple-500" },
    "?": { label: "U", color: "text-emerald-500" },
    "??": { label: "U", color: "text-emerald-500" },
  };
  const entry = map[code] ??
    map[status] ?? { label: status.slice(0, 1) || "?", color: "text-neutral-400" };
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
