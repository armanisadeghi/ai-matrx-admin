"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  Home,
  Info,
  MoreHorizontal,
  RefreshCw,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectExplorerRootOverride,
  setActiveView,
  setExplorerRootOverride,
} from "../../redux";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { SidePanelHeader, SidePanelAction } from "../SidePanelChrome";
import { FileTree } from "./FileTree";

interface ExplorerPanelProps {
  className?: string;
}

const QUICK_ROOTS = ["/", "/home", "/workspace", "/data", "/tmp"];

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { filesystem } = useCodeWorkspace();
  const override = useAppSelector(selectExplorerRootOverride);
  const rootPath = override ?? filesystem.rootPath;
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftPath, setDraftPath] = useState(rootPath);
  const isMock = filesystem.id === "mock";

  const segments = useMemo(() => pathSegments(rootPath), [rootPath]);

  const navigate = useCallback(
    (path: string) => {
      const normalized = normalize(path);
      dispatch(
        setExplorerRootOverride(
          normalized === filesystem.rootPath ? null : normalized,
        ),
      );
    },
    [dispatch, filesystem.rootPath],
  );

  const goUp = useCallback(() => {
    if (rootPath === "/") return;
    navigate(rootPath.replace(/\/[^/]+\/?$/, "") || "/");
  }, [rootPath, navigate]);

  const commitDraft = useCallback(() => {
    navigate(draftPath || "/");
    setEditing(false);
  }, [draftPath, navigate]);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Explorer"
        subtitle={filesystem.label}
        actions={
          <>
            <SidePanelAction
              icon={FilePlus}
              label="New File"
              onClick={() => undefined}
            />
            <SidePanelAction
              icon={FolderPlus}
              label="New Folder"
              onClick={() => undefined}
            />
            <SidePanelAction
              icon={RefreshCw}
              label="Refresh Explorer"
              onClick={() => setRefreshKey((k) => k + 1)}
            />
            <SidePanelAction
              icon={MoreHorizontal}
              label="More"
              onClick={() => undefined}
            />
          </>
        }
      />

      {isMock && (
        <div className="flex items-start gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Info size={12} className="mt-[2px] shrink-0" />
          <div className="flex-1">
            <div>Viewing a demo project. Files aren't real.</div>
            <button
              type="button"
              onClick={() => dispatch(setActiveView("sandboxes"))}
              className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-100"
            >
              <Server size={10} />
              Connect a sandbox
            </button>
          </div>
        </div>
      )}

      {/* Path bar ───────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-2 py-1 text-[11px] dark:border-neutral-800">
        <button
          type="button"
          title="Go to adapter root"
          onClick={() => navigate(filesystem.rootPath)}
          className="flex h-5 w-5 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <Home size={10} />
        </button>
        {editing ? (
          <input
            autoFocus
            value={draftPath}
            onChange={(e) => setDraftPath(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
              if (e.key === "Escape") {
                setEditing(false);
                setDraftPath(rootPath);
              }
            }}
            className="h-5 flex-1 rounded-sm border border-blue-500 bg-white px-1 font-mono text-[11px] outline-none dark:bg-neutral-900"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftPath(rootPath);
              setEditing(true);
            }}
            className="flex min-w-0 flex-1 items-center truncate font-mono text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            title="Click to edit path"
          >
            <BreadcrumbRow segments={segments} onJump={navigate} />
          </button>
        )}
        <button
          type="button"
          onClick={goUp}
          disabled={rootPath === "/"}
          title="Go up"
          className="flex h-5 items-center rounded-sm px-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          ..
        </button>
      </div>

      {/* Quick-jump row — one-click hops to filesystem roots we expect to exist */}
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-neutral-200 px-2 py-1 dark:border-neutral-800">
        {QUICK_ROOTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => navigate(p)}
            className={cn(
              "rounded-sm px-1.5 py-[1px] font-mono text-[10px]",
              rootPath === p
                ? "bg-blue-500 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <FileTree refreshKey={refreshKey} />
    </div>
  );
};

function BreadcrumbRow({
  segments,
  onJump,
}: {
  segments: { name: string; path: string }[];
  onJump: (path: string) => void;
}) {
  if (segments.length === 0) {
    return <span className="text-neutral-500">/</span>;
  }
  return (
    <span className="flex min-w-0 items-center truncate">
      <span
        className="cursor-pointer hover:text-blue-600"
        onClick={(e) => {
          e.stopPropagation();
          onJump("/");
        }}
      >
        /
      </span>
      {segments.map((s, i) => (
        <React.Fragment key={s.path}>
          <ChevronRight
            size={10}
            className="mx-[1px] shrink-0 text-neutral-400"
          />
          <span
            className={cn(
              "truncate",
              i === segments.length - 1
                ? "font-medium text-neutral-900 dark:text-neutral-100"
                : "hover:text-blue-600",
            )}
            onClick={(e) => {
              if (i === segments.length - 1) return;
              e.stopPropagation();
              onJump(s.path);
            }}
          >
            {s.name}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

function normalize(p: string): string {
  if (!p) return "/";
  const collapsed = p.replace(/\/+/g, "/");
  if (collapsed === "/") return "/";
  return collapsed.replace(/\/$/, "");
}

function pathSegments(path: string): { name: string; path: string }[] {
  const normalized = normalize(path);
  if (normalized === "/") return [];
  const parts = normalized.split("/").filter(Boolean);
  return parts.map((name, i) => ({
    name,
    path: "/" + parts.slice(0, i + 1).join("/"),
  }));
}
