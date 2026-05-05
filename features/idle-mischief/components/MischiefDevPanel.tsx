// features/idle-mischief/components/MischiefDevPanel.tsx
//
// Dev-only panel: jump to any act, tweak speed, toggle loop, hard snap-back.
// Shows above the Wand2 button when shift-clicked.

"use client";

import { Wand2, X, Play, RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ACT_QUEUE } from "../constants";
import {
  requestSnapBack,
  selectMischiefCurrentAct,
  selectMischiefSettings,
  selectMischiefStatus,
  setSettings,
  triggerAct,
} from "../state/idleMischiefSlice";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACT_LABELS: Record<string, string> = {
  tremor: "1 — Tremor (subtle jitter)",
  wiggle: "2 — Wiggle (button float)",
  eyes: "3 — Eyes (sidebar icons → eyeballs)",
  "walking-sidebar": "4 — Walking Sidebar",
  snow: "5 — Snow",
  "tower-collapse": "6 — Tower Collapse",
  carnival: "7 — Carnival",
};

export function MischiefDevPanel({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectMischiefSettings);
  const currentAct = useAppSelector(selectMischiefCurrentAct);
  const status = useAppSelector(selectMischiefStatus);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-16 right-4 z-[2147483647] w-72 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl text-xs text-foreground"
      role="dialog"
      aria-label="Idle Mischief Dev Panel"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-2 font-semibold">
          <Wand2 className="h-3.5 w-3.5" />
          Mischief
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="font-mono">
            {status}
            {currentAct ? ` · ${currentAct}` : ""}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            Jump to act
          </div>
          {ACT_QUEUE.map((sched) => (
            <button
              key={sched.id}
              type="button"
              onClick={() => dispatch(triggerAct(sched.id))}
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-accent transition-colors text-left"
            >
              <Play className="h-3 w-3 shrink-0 opacity-60" />
              <span className="flex-1">{ACT_LABELS[sched.id]}</span>
              <span className="text-muted-foreground/60 text-[10px]">
                {sched.threshold}s
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-border/60 pt-2 space-y-2">
          <label className="flex items-center gap-2">
            <span className="w-14 text-muted-foreground">Speed</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={settings.speed}
              onChange={(e) =>
                dispatch(setSettings({ speed: parseFloat(e.target.value) }))
              }
              className="flex-1"
            />
            <span className="w-8 text-right font-mono">{settings.speed.toFixed(2)}x</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={(e) => dispatch(setSettings({ loop: e.target.checked }))}
            />
            <span>Loop forever</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                dispatch(setSettings({ enabled: e.target.checked }))
              }
            />
            <span>Enabled</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => dispatch(requestSnapBack())}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded bg-secondary/40 hover:bg-secondary/60 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Snap back now
        </button>
      </div>
    </div>
  );
}
