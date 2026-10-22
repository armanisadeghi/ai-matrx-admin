"use client";

/**
 * "What your agents can make" on Meet Matrx: the shapes chat offers on Can make (the same
 * `content_ir.chat_offered_shapes` read, the same identities, the same order), each a pill that opens a
 * new chat with that shape already picked (`/chat/new?make=<kind>`). Arman, 2026-10-14: shapes are what
 * our agents can make, as important as the pieces above them.
 *
 * Read once per page (module cache), only when Meet Matrx is on screen. Until it lands, gray pills hold
 * the row's place so nothing below moves when it arrives.
 */

import { useEffect, useState } from "react";
import { DynamicIcon } from "@ai-matrx/icons";
import { IntroStage, type IntroGroup } from "@ai-matrx/design-system/intro-stage";
import { supabase } from "@/utils/supabase/client";
import { meetMatrxLink } from "./meetMatrx";

export const CAN_MAKE_LABEL = "What your agents can make";

export interface CanMakeShape {
  kind: string;
  short_label: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

/** Where a shape's pill goes: a new chat with that shape picked on Can make. */
export function canMakeHref(kind: string): string {
  return `/chat/new?make=${encodeURIComponent(kind)}`;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** The pills, in Can make's order. A row without a valid identity color is left out rather than drawn wrong. */
export function canMakeGroup(shapes: readonly CanMakeShape[]): IntroGroup {
  return {
    id: "can-make",
    label: CAN_MAKE_LABEL,
    size: "chips",
    items: [...shapes]
      .filter((s) => s.color && HEX.test(s.color))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        id: `make-${s.kind}`,
        name: s.short_label,
        pitch: "",
        href: canMakeHref(s.kind),
        // Any Lucide name, loaded on demand (the hot-set lookup knows only ~140 names and drew a bolt for the rest).
        identity: { color: s.color as string },
        icon: <DynamicIcon name={s.icon} color="#FFFFFF" fallbackIcon="Shapes" />,
      })),
  };
}

let cached: Promise<CanMakeShape[]> | null = null;

function loadShapes(): Promise<CanMakeShape[]> {
  cached ??= (async () => {
    const { data, error } = await supabase.schema("content_ir").rpc("chat_offered_shapes");
    if (error) throw new Error(`Could not load what agents can make: ${error.message}`);
    return (data ?? []) as CanMakeShape[];
  })();
  cached.catch(() => {
    cached = null; // a failed read is retried on the next open
  });
  return cached;
}

const PLACEHOLDER_WIDTHS = ["w-24", "w-20", "w-28", "w-24", "w-28", "w-24", "w-32", "w-20", "w-28", "w-20", "w-28", "w-28", "w-20", "w-24", "w-28"];

export function MeetMatrxCanMake() {
  const [shapes, setShapes] = useState<CanMakeShape[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadShapes().then(
      (rows) => live && setShapes(rows),
      (err: unknown) => live && setFailed(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      live = false;
    };
  }, []);

  if (failed) {
    // Honest, never silent: the row says it could not load (Law 4).
    return (
      <div className="mt-12" data-intro-group="can-make">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{CAN_MAKE_LABEL}</h2>
        <p className="text-sm text-muted-foreground">{failed}</p>
      </div>
    );
  }
  if (!shapes) {
    return (
      <div className="mt-12" data-intro-group="can-make" aria-busy="true">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{CAN_MAKE_LABEL}</h2>
        <ul className="flex flex-wrap gap-2">
          {PLACEHOLDER_WIDTHS.map((w, i) => (
            <li key={i} className={`h-8 ${w} animate-pulse rounded-full bg-muted`} />
          ))}
        </ul>
      </div>
    );
  }
  const group = canMakeGroup(shapes);
  if (group.items.length === 0) return null;
  return (
    <div className="mt-12">
      <IntroStage groups={[group]} renderLink={meetMatrxLink} />
    </div>
  );
}
