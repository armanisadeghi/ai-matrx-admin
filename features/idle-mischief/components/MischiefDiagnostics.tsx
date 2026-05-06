// features/idle-mischief/components/MischiefDiagnostics.tsx
//
// Admin-only diagnostic popover. Draggable. Shows real-time feedback:
//   - current status + act
//   - last snap-back stats (incl. how many stragglers the sweep caught)
//   - log of recent events / errors
//
// Lifecycle:
//   - Hidden by default (`popoverDismissed = true`).
//   - When an act fires (manual trigger or idle-driven), the slice flips
//     `popoverDismissed = false` → popover appears.
//   - Stays visible during the show AND after it ends, until the admin
//     clicks the close button (`setPopoverDismissed(true)`).
//   - Next time an act fires, it reappears.

"use client";

import { useEffect, useRef, useState } from "react";
import { X, GripVertical, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  clearLog,
  selectMischiefCurrentAct,
  selectMischiefLastRestoreStats,
  selectMischiefLog,
  selectMischiefPopoverDismissed,
  selectMischiefStatus,
  setPopoverDismissed,
} from "../state/idleMischiefSlice";

const INITIAL_X = typeof window !== "undefined" ? window.innerWidth - 360 : 100;
const INITIAL_Y = 80;

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

const LEVEL_COLOR: Record<string, string> = {
  info: "text-slate-300",
  warn: "text-amber-300",
  error: "text-rose-300",
};

export function MischiefDiagnostics() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectMischiefStatus);
  const currentAct = useAppSelector(selectMischiefCurrentAct);
  const log = useAppSelector(selectMischiefLog);
  const stats = useAppSelector(selectMischiefLastRestoreStats);
  const dismissed = useAppSelector(selectMischiefPopoverDismissed);

  const [pos, setPos] = useState({ x: INITIAL_X, y: INITIAL_Y });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!dragRef.current) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({
        x: e.clientX - dragRef.current.dx,
        y: e.clientY - dragRef.current.dy,
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  });

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      dx: e.clientX - pos.x,
      dy: e.clientY - pos.y,
    };
  };

  if (dismissed) return null;

  const statusBadge =
    status === "playing"
      ? { color: "bg-violet-500", text: `▶ ${currentAct ?? "?"}` }
      : status === "snapping-back"
        ? { color: "bg-amber-500 animate-pulse", text: "↺ snapping back" }
        : { color: "bg-slate-500", text: "idle" };

  return (
    <div
      role="dialog"
      aria-label="Idle Mischief Diagnostics"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 2147483647,
        width: 340,
        maxHeight: "60vh",
      }}
      className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-100 text-[11px] flex flex-col overflow-hidden font-mono"
    >
      {/* Header — drag handle + close */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800/80 border-b border-slate-700 cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical size={11} className="text-slate-500 shrink-0" />
        <span className="font-semibold text-slate-200">Mischief · diagnostics</span>
        <span
          className={`ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusBadge.color}`} />
          {statusBadge.text}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(clearLog());
          }}
          className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 shrink-0"
          title="Clear log"
        >
          <Trash2 size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dispatch(setPopoverDismissed(true));
          }}
          className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 shrink-0"
          title="Close — reappears on next show"
        >
          <X size={11} />
        </button>
      </div>

      {/* Stats strip */}
      <div className="px-2 py-1.5 border-b border-slate-700/60 bg-slate-900/60 grid grid-cols-5 gap-1 text-center">
        <div>
          <div className="text-[9px] uppercase text-slate-500 tracking-wider">cleanups</div>
          <div className="text-slate-200">{stats?.cleanups ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-slate-500 tracking-wider">portals</div>
          <div className="text-slate-200">{stats?.portals ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-slate-500 tracking-wider">snaps</div>
          <div className="text-slate-200">{stats?.snapshots ?? "—"}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-slate-500 tracking-wider">swept-c</div>
          <div
            className={
              (stats?.sweptClones ?? 0) > 0
                ? "text-amber-300 font-semibold"
                : "text-slate-200"
            }
          >
            {stats?.sweptClones ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase text-slate-500 tracking-wider">swept-o</div>
          <div
            className={
              (stats?.sweptOriginals ?? 0) > 0
                ? "text-amber-300 font-semibold"
                : "text-slate-200"
            }
          >
            {stats?.sweptOriginals ?? "—"}
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-2 py-1 bg-slate-950/60 min-h-[120px]">
        {log.length === 0 ? (
          <div className="text-slate-500 italic text-[10px] py-3 text-center">
            no events yet
          </div>
        ) : (
          <ul className="space-y-0.5">
            {log.map((entry) => (
              <li key={entry.id} className="flex gap-1.5 leading-tight">
                <span className="text-slate-600 shrink-0 text-[9px] tabular-nums pt-px">
                  {fmtTime(entry.ts)}
                </span>
                <span className={`${LEVEL_COLOR[entry.level]} break-all`}>
                  {entry.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-2 py-1 border-t border-slate-700/60 bg-slate-900/60 text-[9px] text-slate-500">
        Drag the header to move · close X dismisses until next show
      </div>
    </div>
  );
}
