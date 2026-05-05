// features/idle-mischief/components/MischiefControls.tsx
//
// Compact control surface for the idle-mischief subsystem, designed to
// live inside the admin indicator's MediumIndicator panel. No floating
// buttons — this is a section that drops cleanly into existing rows of
// debug controls.

"use client";

import { useState } from "react";
import {
  Wand2,
  Vibrate,
  Waves,
  Eye,
  Footprints,
  Snowflake,
  Layers,
  PartyPopper,
  CloudHail,
  Megaphone,
  Droplets,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ACT_QUEUE } from "../constants";
import type { MischiefActId } from "../types";
import {
  requestSnapBack,
  selectMischiefCurrentAct,
  selectMischiefSettings,
  selectMischiefStatus,
  setSettings,
  triggerAct,
} from "../state/idleMischiefSlice";

const ACT_META: Record<
  MischiefActId,
  { icon: typeof Vibrate; label: string; color: string }
> = {
  tremor: { icon: Vibrate, label: "Tremor", color: "text-slate-300" },
  wiggle: { icon: Waves, label: "Wiggle", color: "text-blue-300" },
  eyes: { icon: Eye, label: "Eyes", color: "text-cyan-300" },
  "walking-sidebar": {
    icon: Footprints,
    label: "Walk",
    color: "text-amber-300",
  },
  snow: { icon: Snowflake, label: "Snow", color: "text-sky-200" },
  "tower-collapse": {
    icon: Layers,
    label: "Tower",
    color: "text-rose-300",
  },
  carnival: { icon: PartyPopper, label: "Carnival", color: "text-pink-300" },
  avalanche: { icon: CloudHail, label: "Avalanche", color: "text-orange-300" },
  "roll-call": {
    icon: Megaphone,
    label: "Roll Call",
    color: "text-emerald-300",
  },
  liquify: { icon: Droplets, label: "Liquify", color: "text-purple-300" },
};

export function MischiefControls() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectMischiefSettings);
  const status = useAppSelector(selectMischiefStatus);
  const currentAct = useAppSelector(selectMischiefCurrentAct);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1 text-[10px] hover:bg-slate-800/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={10} className="text-slate-400" />
        ) : (
          <ChevronRight size={10} className="text-slate-400" />
        )}
        <Wand2 size={11} className="text-violet-300" />
        <span className="text-slate-300 font-medium">Idle Mischief</span>
        {status === "playing" && currentAct && (
          <span className="ml-auto text-violet-300 text-[10px] flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            {ACT_META[currentAct]?.label ?? currentAct}
          </span>
        )}
        {status === "snapping-back" && (
          <span className="ml-auto text-amber-300 text-[10px]">snapping back</span>
        )}
        {status === "idle" && !expanded && (
          <span className="ml-auto text-slate-500 text-[10px]">idle</span>
        )}
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Act trigger grid */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 mr-1 shrink-0 w-10">Play</span>
              <div className="flex flex-wrap items-center gap-1 flex-1">
                {ACT_QUEUE.map((sched, i) => {
                  const meta = ACT_META[sched.id];
                  const Icon = meta.icon;
                  const isCurrent = currentAct === sched.id;
                  return (
                    <button
                      key={sched.id}
                      type="button"
                      onClick={() => dispatch(triggerAct(sched.id))}
                      className={`relative p-1 rounded transition-colors ${
                        isCurrent
                          ? "bg-violet-700/60 text-violet-100"
                          : `hover:bg-slate-700 ${meta.color}`
                      }`}
                      title={`${i + 1} — ${meta.label} (idle: ${sched.threshold}s)`}
                    >
                      <Icon size={12} />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => dispatch(requestSnapBack())}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition-colors shrink-0"
                title="Snap back now"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 w-10 shrink-0">Speed</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={settings.speed}
              onChange={(e) =>
                dispatch(setSettings({ speed: parseFloat(e.target.value) }))
              }
              className="flex-1 accent-violet-400"
            />
            <span className="text-slate-300 font-mono w-10 text-right shrink-0">
              {settings.speed.toFixed(2)}x
            </span>
          </label>

          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  dispatch(setSettings({ enabled: e.target.checked }))
                }
                className="accent-violet-400"
              />
              <span>Enabled</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.loop}
                onChange={(e) =>
                  dispatch(setSettings({ loop: e.target.checked }))
                }
                className="accent-violet-400"
              />
              <span>Loop</span>
            </label>
            <span className="ml-auto text-slate-500">⌘⇧M = tremor</span>
          </div>
        </div>
      )}
    </div>
  );
}
