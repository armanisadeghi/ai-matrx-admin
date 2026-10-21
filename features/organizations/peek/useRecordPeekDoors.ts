"use client";

/**
 * useRecordPeekDoors — a record peek's way to the full record, for THE peek (`Peek` in `PeekWindow`).
 *
 * The same two doors the old peek dialog's footer had, decided the same way:
 *   - "Open" (the primary): closes the peek and moves this tab to the record;
 *   - Open in new tab (`href`, the footer's right-most door).
 * Where the record lives: the caller that OPENED the peek wins (`usePeekHrefOverride` — `null` means it
 * deliberately has none), then an explicit `href`, then the entity registry for `token` + `id` (THE
 * DOOR LAW: never a hand-built route that can drift). No destination → no doors, never a dead button.
 */

import { useRouter } from "next/navigation";
import type { PeekRecord } from "@ai-matrx/design-system";
import { resolveEntityDoors } from "@/components/official/entity-ref/doors";
import { usePeekHrefOverride } from "./peekHrefOverride";
import { expectNavigation } from "@ai-matrx/summon/url";

export function useRecordPeekDoors({
  token,
  id,
  href,
  onClose,
}: {
  token?: string | null;
  id?: string | null;
  href?: string | null;
  onClose: () => void;
}): Pick<PeekRecord, "primary" | "href"> {
  const router = useRouter();
  const override = usePeekHrefOverride();
  const resolved = override !== undefined ? override : (href ?? (token && id ? resolveEntityDoors(token, id).href : null));
  if (!resolved) return {};
  return {
    primary: {
      label: "Open",
      onSelect: () => {
        onClose();
        expectNavigation(resolved); // a window closes before this push: the overlay layer writes no address behind it
        router.push(resolved);
      },
    },
    href: resolved,
  };
}
