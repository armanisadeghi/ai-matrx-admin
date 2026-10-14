"use client";

/**
 * SandboxLogsView — read-only logs viewer for one sandbox.
 *
 * Polls `/api/sandbox/[id]/logs?source=…&tail=…` on a 3s interval (matches
 * the existing diagnostics-panel cadence). The user can pick a source and
 * adjust the tail size; output sticks to the bottom unless the user
 * scrolls up.
 *
 * Lives inside the bottom-panel "terminal" host as one of the auto-spawned
 * sessions on sandbox connect. No xterm — plain `<pre>` rendering keeps
 * memory low even for very long logs.
 */

import { Button, Select } from "@ai-matrx/design-system/controls";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import SuspenseLoader from "@/components/loaders/SuspenseLoader";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const SOURCES = [
  { value: "all", label: "All" },
  { value: "docker", label: "Container" },
  { value: "matrx_agent", label: "Matrx Agent" },
  { value: "aidream", label: "AIDream" },
  { value: "entrypoint", label: "Entrypoint" },
  { value: "autostart", label: "Autostart" },
] as const;

const TAIL_OPTIONS = [100, 200, 500, 1000, 2000] as const;

const POLL_INTERVAL_MS = 3000;

type SourceValue = (typeof SOURCES)[number]["value"];

interface SandboxLogsViewProps {
  sandboxId: string;
  className?: string;
  /** When false, the view is mounted but not currently visible — we keep
   *  polling so the buffer stays warm, but skip auto-scroll since the user
   *  can't see it. */
  visible?: boolean;
}

export const SandboxLogsView: React.FC<SandboxLogsViewProps> = ({
  sandboxId,
  className,
  visible = true,
}) => {
  const [source, setSource] = useState<SourceValue>("all");
  const [tail, setTail] = useState<number>(500);
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLPreElement | null>(null);
  // Track whether the user has scrolled away from the bottom — if so, we
  // stop sticky-scrolling so they don't get yanked back when new lines arrive.
  const stickToBottomRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/sandbox/${encodeURIComponent(sandboxId)}/logs?source=${source}&tail=${tail}`;
      const resp = await fetch(url, { method: "GET", cache: "no-store" });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(
          `${resp.status} ${resp.statusText}${body ? `: ${body}` : ""}`,
        );
      }
      const body = await resp.text();
      setText(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sandboxId, source, tail]);

  // Initial load + interval poll. Pause halts the poll but leaves the current
  // buffer on screen. The poll also stops while the panel is hidden — this
  // component stays mounted (CSS-hidden) when the user switches to another
  // bottom-panel tab, and a 3s log poll against the orchestrator has no reason
  // to run for a panel nobody is looking at. Becoming visible re-runs this
  // effect and (unless the user has paused) refetches immediately, so the
  // buffer is current on return.
  useEffect(() => {
    if (paused || !visible) return undefined;
    void fetchOnce();
    const handle = window.setInterval(() => {
      void fetchOnce();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [fetchOnce, paused, visible]);

  // Sticky scroll-to-bottom when new content arrives, unless the user
  // scrolled up.
  useEffect(() => {
    if (!visible) return;
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [text, visible]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 24;
  }, []);

  const jumpToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white dark:bg-neutral-950",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 text-[11px] dark:border-neutral-800">
        <label className="flex items-center gap-1">
          <span className="text-neutral-500 dark:text-neutral-400">Source</span>
          <Select
            aria-label="Source"
            value={source}
            onValueChange={(v) => setSource(v as SourceValue)}
            options={SOURCES}
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-neutral-500 dark:text-neutral-400">Tail</span>
          <Select
            aria-label="Tail"
            value={String(tail)}
            onValueChange={(v) => setTail(Number(v))}
            options={TAIL_OPTIONS.map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
        </label>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="quiet"
            onClick={() => void fetchOnce()}
            disabled={loading}
            aria-label="Refresh now"
            icon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
          />
          <Button
            variant="quiet"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume polling" : "Pause polling"}
            icon={paused ? <Play /> : <Pause />}
          />
          <Button
            variant="quiet"
            onClick={jumpToBottom}
            aria-label="Jump to bottom"
            icon={<ChevronDown />}
          />
        </div>
      </div>

      {/* Body */}
      <pre
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-snug text-neutral-800 dark:text-neutral-200"
      >
        {error ? (
          <span className="text-red-600 dark:text-red-400">
            Failed to load logs: {error}
            <ErrorAlchemyMenu error={error} />
          </span>
        ) : text ? (
          text
        ) : loading ? (
          <span className="text-neutral-500 dark:text-neutral-400">
            <SuspenseLoader
              centered={false}
              size="xs"
              message={`Loading ${SOURCES.find((item) => item.value === source)?.label.toLowerCase() ?? "sandbox"} logs…`}
            />
          </span>
        ) : (
          <span className="text-neutral-500 dark:text-neutral-400">
            No output.
          </span>
        )}
      </pre>
    </div>
  );
};

export default SandboxLogsView;
