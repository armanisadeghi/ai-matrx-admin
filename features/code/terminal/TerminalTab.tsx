"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  clearLines,
  selectTerminalHistory,
  selectTerminalLines,
} from "../redux";
import { useTerminalSession } from "../hooks/useTerminalSession";

interface TerminalTabProps {
  className?: string;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const lines = useAppSelector(selectTerminalLines);
  const history = useAppSelector(selectTerminalHistory);
  const { run, executing, cwd, isReady } = useTerminalSession();

  const terminalLines = useMemo(
    () => lines.filter((l) => l.tab === "terminal"),
    [lines],
  );

  const [input, setInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [terminalLines.length]);

  const submit = useCallback(() => {
    if (!input.trim() || executing) return;
    const cmd = input;
    setInput("");
    setHistoryIdx(null);
    void run(cmd);
  }, [input, executing, run]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "ArrowUp") {
        if (history.length === 0) return;
        e.preventDefault();
        const idx =
          historyIdx === null
            ? history.length - 1
            : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setInput(history[idx] ?? "");
      } else if (e.key === "ArrowDown") {
        if (historyIdx === null) return;
        e.preventDefault();
        const nextIdx = historyIdx + 1;
        if (nextIdx >= history.length) {
          setHistoryIdx(null);
          setInput("");
        } else {
          setHistoryIdx(nextIdx);
          setInput(history[nextIdx] ?? "");
        }
      } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        dispatch(clearLines("terminal"));
      }
    },
    [dispatch, history, historyIdx, submit],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#1e1e1e] font-mono text-[12px] text-neutral-200",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto whitespace-pre-wrap px-3 py-2 leading-[1.5]"
      >
        {terminalLines.length === 0 && (
          <div className="text-neutral-500">
            {isReady
              ? `Connected \u2014 ${cwd}. Type a command and press Enter.`
              : "No process adapter connected."}
          </div>
        )}
        {terminalLines.map((line) => (
          <div key={line.id} className="whitespace-pre-wrap">
            {line.type === "command" ? (
              <div className="flex items-center gap-2">
                <span className="text-green-400">
                  {line.cwd ? shortCwd(line.cwd) : "$"}
                </span>
                <span className="text-blue-400">&gt;</span>
                <span className="text-neutral-100">{line.text}</span>
              </div>
            ) : line.type === "stdout" ? (
              <span className="text-neutral-200">{line.text}</span>
            ) : line.type === "stderr" ? (
              <span className="text-red-400">{line.text}</span>
            ) : (
              <span
                className={cn(
                  "text-[11px]",
                  line.exitCode && line.exitCode !== 0
                    ? "text-red-400"
                    : "text-neutral-500",
                )}
              >
                {line.text}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-neutral-800 bg-[#1e1e1e] px-3 py-1.5">
        <span className="text-green-400">{shortCwd(cwd)}</span>
        <span className="text-blue-400">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isReady || executing}
          placeholder={
            executing ? "Executing\u2026" : "Type a command and press Enter"
          }
          className="flex-1 bg-transparent text-neutral-100 outline-none placeholder:text-neutral-500"
          autoFocus
        />
        <button
          type="button"
          aria-label="Clear terminal"
          title="Clear terminal (Ctrl+L)"
          onClick={() => dispatch(clearLines("terminal"))}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

function shortCwd(cwd: string): string {
  if (!cwd) return "$";
  const home = "/home/agent";
  if (cwd === home) return "~";
  if (cwd.startsWith(`${home}/`)) return `~/${cwd.slice(home.length + 1)}`;
  return cwd;
}
