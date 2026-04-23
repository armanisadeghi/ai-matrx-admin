"use client";

/**
 * DebugStrip — dev-only geometry + viewport readout rendered at the top of
 * the WindowPanel body when `isDebugMode` is on. Extracted from
 * WindowPanel.tsx Phase 6 — purely presentational with its own resize
 * subscription; no coupling to the parent shell.
 */
import { useEffect, useState } from "react";

interface DebugStripProps {
  rect: { x: number; y: number; width: number; height: number };
  zIndex: number;
}

export function DebugStrip({ rect, zIndex }: DebugStripProps) {
  const [vp, setVp] = useState(() =>
    typeof window === "undefined"
      ? { vw: 0, vh: 0, sw: 0, sh: 0, dpr: 1 }
      : {
          vw: window.innerWidth,
          vh: window.innerHeight,
          sw: window.screen.width,
          sh: window.screen.height,
          dpr: window.devicePixelRatio ?? 1,
        },
  );

  useEffect(() => {
    const update = () =>
      setVp({
        vw: window.innerWidth,
        vh: window.innerHeight,
        sw: window.screen.width,
        sh: window.screen.height,
        dpr: window.devicePixelRatio ?? 1,
      });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const windowEntries: [string, number][] = [
    ["x", rect.x],
    ["y", rect.y],
    ["w", rect.width],
    ["h", rect.height],
    ["z", zIndex],
  ];

  const viewportEntries: [string, number | string][] = [
    ["vw", vp.vw],
    ["vh", vp.vh],
    ["sw", vp.sw],
    ["sh", vp.sh],
    ["dpr", vp.dpr],
  ];

  return (
    <div className="flex flex-col gap-0.5 px-3 py-1.5 border-b border-amber-500/20 bg-amber-500/5 shrink-0 font-mono text-[10px]">
      {/* Row 1 — window position/size */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-amber-400/50 uppercase tracking-wide text-[9px]">
          win
        </span>
        {windowEntries.map(([label, val]) => (
          <span
            key={label}
            className="inline-flex items-center gap-0.5 leading-none"
          >
            <span className="text-amber-500/60">{label}:</span>
            <span className="text-amber-400 font-bold tabular-nums">
              {Math.round(val as number)}
            </span>
          </span>
        ))}
      </div>
      {/* Row 2 — viewport / screen */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sky-400/50 uppercase tracking-wide text-[9px]">
          vp
        </span>
        {viewportEntries.map(([label, val]) => (
          <span
            key={label}
            className="inline-flex items-center gap-0.5 leading-none"
          >
            <span className="text-sky-500/60">{label}:</span>
            <span className="text-sky-400 font-bold tabular-nums">
              {typeof val === "number" && !Number.isInteger(val)
                ? val.toFixed(2)
                : Math.round(val as number)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
