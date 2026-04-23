"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { useOpenFile } from "../../hooks/useOpenFile";
import type { FilesystemNode } from "../../types";
import { SidePanelHeader } from "../SidePanelChrome";

interface SearchPanelProps {
  className?: string;
}

interface Match {
  path: string;
  line: number;
  text: string;
}

const MAX_FILES = 400;
const MAX_FILE_SIZE = 512 * 1024; // skip files larger than this
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
]);

export const SearchPanel: React.FC<SearchPanelProps> = ({ className }) => {
  const { filesystem } = useCodeWorkspace();
  const openFile = useOpenFile();

  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scannedFiles, setScannedFiles] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const activeRun = useRef(0);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      setError(null);
      setMatches([]);
      setScannedFiles(0);
      if (!trimmed) return;

      const runId = ++activeRun.current;
      setSearching(true);

      const needle = caseSensitive ? trimmed : trimmed.toLowerCase();
      const hits: Match[] = [];
      let scanned = 0;

      const walk = async (dir: string): Promise<FilesystemNode[]> => {
        try {
          return await filesystem.listChildren(dir);
        } catch {
          return [];
        }
      };

      const stack: string[] = [filesystem.rootPath];
      while (stack.length > 0 && runId === activeRun.current) {
        const current = stack.shift()!;
        const entries = await walk(current);
        for (const entry of entries) {
          if (runId !== activeRun.current) break;
          if (entry.kind === "directory") {
            if (SKIP_DIRS.has(entry.name)) continue;
            stack.push(entry.path);
            continue;
          }
          if (scanned >= MAX_FILES) continue;
          if (entry.size && entry.size > MAX_FILE_SIZE) continue;
          scanned++;
          try {
            const content = await filesystem.readFile(entry.path);
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const lineText = lines[i];
              const hay = caseSensitive ? lineText : lineText.toLowerCase();
              if (hay.includes(needle)) {
                hits.push({
                  path: entry.path,
                  line: i + 1,
                  text: lineText,
                });
              }
            }
            if (runId === activeRun.current) {
              setMatches([...hits]);
              setScannedFiles(scanned);
            }
          } catch {
            continue;
          }
        }
      }

      if (runId === activeRun.current) {
        setSearching(false);
      }
    },
    [filesystem, caseSensitive],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => clearTimeout(id);
  }, [query, runSearch]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      if (!map.has(m.path)) map.set(m.path, []);
      map.get(m.path)!.push(m);
    }
    return Array.from(map.entries());
  }, [matches]);

  const toggleFile = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader title="Search" subtitle={filesystem.label} />
      <div className="flex flex-col gap-1.5 border-b border-neutral-200 p-2 dark:border-neutral-800">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workspace"
            className="h-7 w-full rounded-sm border border-neutral-300 bg-white pl-6 pr-6 text-[12px] outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-3 w-3"
            />
            Case sensitive
          </label>
          <span>
            {searching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                {scannedFiles} files
              </span>
            ) : matches.length > 0 ? (
              `${matches.length} results in ${grouped.length} files`
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <div className="p-3 text-[11px] text-red-500">{error}</div>}
        {!query && !error && (
          <div className="p-3 text-[11px] text-neutral-500">
            Type a query to search across the active workspace.
          </div>
        )}
        {query && !searching && matches.length === 0 && !error && (
          <div className="p-3 text-[11px] text-neutral-500">
            No matches found.
          </div>
        )}
        {grouped.map(([path, items]) => {
          const isCollapsed = collapsed.has(path);
          const name = path.split("/").pop() ?? path;
          return (
            <div
              key={path}
              className="border-b border-neutral-100 dark:border-neutral-900"
            >
              <button
                type="button"
                onClick={() => toggleFile(path)}
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              >
                {isCollapsed ? (
                  <ChevronRight size={10} />
                ) : (
                  <ChevronDown size={10} />
                )}
                <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">
                  {name}
                </span>
                <span className="ml-auto shrink-0 rounded bg-neutral-200 px-1 text-[9px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  {items.length}
                </span>
              </button>
              {!isCollapsed &&
                items.map((m, idx) => (
                  <button
                    key={`${path}:${m.line}:${idx}`}
                    type="button"
                    onClick={() => void openFile(m.path)}
                    className="flex w-full items-center gap-2 px-4 py-0.5 text-left font-mono text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  >
                    <span className="shrink-0 tabular-nums text-neutral-500">
                      {m.line}
                    </span>
                    <span className="truncate text-neutral-700 dark:text-neutral-300">
                      {m.text.length > 120
                        ? `${m.text.slice(0, 120).trimStart()}…`
                        : m.text.trimStart()}
                    </span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
