"use client";

/**
 * Other people's carets and selections in an open document (COLLAB-DESIGN §6.8, unit C8).
 *
 * The office package publishes each seat's caret on Yjs awareness and moves it through every edit
 * (`awareness.carets`, body offsets). Univer draws on a canvas, so this layer asks Univer where a body offset is on
 * screen (`calcDocRangePositions`, the call its own comment and popup layers use) and draws a thin caret, a name
 * flag and a translucent selection per seat over it. The person's name and color are the ones their presence chip
 * already shows; nothing here picks a color. The layer never takes a click.
 */
import type { Univer } from "@univerjs/core";
import { DocSkeletonManagerService } from "@univerjs/docs";
import { calcDocRangePositions } from "@univerjs/docs-ui";
import { IRenderManagerService } from "@univerjs/engine-render";
import { useEffect, useRef, useState } from "react";

import type { RemoteCaret } from "@ai-matrx/office/docs";

import { FLAG_HEIGHT, flagSlots } from "@/features/documents/components/caretFlagStack";

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Placed {
  key: string;
  name: string;
  color: string;
  /** The selection's line boxes, relative to this layer (empty for a bare caret). */
  lines: Box[];
  /** Where the caret stands (the end of the selection), relative to this layer. */
  caret: Box;
}

const POLL_MS = 100;

/** Black or white, whichever reads on this color. */
function textOn(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return "#fff";
  const n = parseInt(m[1]!, 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.4 ? "#111827" : "#fff";
}

let warned = false;

function placeCarets(univer: Univer, unitId: string, carets: RemoteCaret[], origin: { left: number; top: number }): Placed[] {
  const injector = (univer as unknown as { __getInjector?: () => { get: <T>(token: unknown) => T | undefined } }).__getInjector?.();
  const manager = injector?.get<{ getRenderUnitById?: (id: string) => unknown }>(IRenderManagerService as unknown);
  if (!manager || typeof manager.getRenderUnitById !== "function") {
    if (!warned) {
      warned = true;
      console.warn("[remote-carets] Univer's render manager is not reachable", manager ? Object.getOwnPropertyNames(Object.getPrototypeOf(manager)).slice(0, 12) : manager);
    }
    return [];
  }
  const render = manager.getRenderUnitById(unitId) as
    | (Parameters<typeof calcDocRangePositions>[1] & { with: <T>(token: unknown) => T })
    | undefined;
  if (!render) return [];
  const body = render.with<InstanceType<typeof DocSkeletonManagerService>>(DocSkeletonManagerService).getSkeleton().getViewModel().getDataModel().getBody();
  const max = Math.max(0, (body?.dataStream.length ?? 2) - 2);
  const out: Placed[] = [];
  for (const c of carets) {
    const r = c.ranges[0];
    if (!r) continue;
    const start = Math.min(r.start, max);
    const end = Math.min(r.end, max);
    try {
      const boxes = calcDocRangePositions({ startOffset: start, endOffset: end, collapsed: start === end, segmentId: "", segmentPage: -1 }, render);
      if (!boxes || boxes.length === 0) continue;
      const rel = (b: Box): Box => ({ left: b.left - origin.left, right: b.right - origin.left, top: b.top - origin.top, bottom: b.bottom - origin.top });
      const last = boxes[boxes.length - 1]!;
      const caretBox = rel(start === end ? last : { ...last, left: last.right });
      out.push({ key: c.key, name: c.name, color: c.color, lines: start === end ? [] : boxes.map(rel), caret: caretBox });
    } catch {
      /* the layout is not ready for this offset yet: draw it on the next tick */
    }
  }
  return out;
}

const same = (a: Placed[], b: Placed[]) => JSON.stringify(a) === JSON.stringify(b);

export function RemoteDocCarets({ univer, unitId, carets }: { univer: Univer | null; unitId: string | null; carets: RemoteCaret[] }) {
  const root = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const caretsRef = useRef(carets);
  caretsRef.current = carets;

  useEffect(() => {
    if (!univer || !unitId || carets.length === 0) {
      setPlaced([]);
      return;
    }
    const tick = () => {
      const el = root.current;
      if (!el) return;
      const o = el.getBoundingClientRect();
      let next: Placed[] = [];
      try {
        next = placeCarets(univer, unitId, caretsRef.current, { left: o.left, top: o.top });
      } catch (err) {
        // a caret layer never takes the editor down
        if (!warned) {
          warned = true;
          console.warn("[remote-carets] could not place other people's carets", err);
        }
      }
      setPlaced((prev) => (same(prev, next) ? prev : next));
    };
    tick();
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [univer, unitId, carets.length > 0]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true" data-remote-carets="">
      {placed.map((p, index) => {
        const slot = flagSlots(placed.map((q) => q.caret))[index] ?? 0;
        const h = Math.max(p.caret.bottom - p.caret.top, 12);
        const flagBelow = p.caret.top < 18;
        return (
          <div key={p.key} data-remote-caret={p.name}>
            {p.lines.map((l, i) => (
              <div
                key={i}
                className="absolute"
                style={{ left: l.left, top: l.top, width: Math.max(l.right - l.left, 2), height: l.bottom - l.top, backgroundColor: `color-mix(in srgb, ${p.color} 28%, transparent)` }}
              />
            ))}
            <div className="absolute" style={{ left: p.caret.left - 1, top: p.caret.top, width: 2, height: h, backgroundColor: p.color }}>
              <span
                className="absolute left-0 whitespace-nowrap rounded-sm px-1 text-[10px] font-medium leading-[14px] shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                style={{ [flagBelow ? "top" : "bottom"]: `calc(100% + ${slot * FLAG_HEIGHT}px)`, backgroundColor: p.color, color: textOn(p.color) }}
              >
                {p.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
