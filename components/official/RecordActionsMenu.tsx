"use client";

// components/official/RecordActionsMenu.tsx
//
// ONE "…" MENU for a record's actions, drawn by the canonical v3 `ItemMenu`
// (dropdown on desktop, drawer on a phone). A host that has no shell header —
// a Board tile, a window — keeps ONE row of chrome: the everyday actions as
// buttons and everything else here. The page and the tile list the same
// actions, so a host never invents its own overflow dropdown.
//
// The input is the same `{ label, icon, onPress }` shape the page headers take
// (`EntityHeaderAction`); destructive actions land in their own section.

import type { ComponentType } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { ItemMenu } from "@ai-matrx/design-system/item";
import type { ItemMenuEntry, ItemMenuSection } from "@ai-matrx/design-system/item";
import { Button } from "@/components/ui/button";

export interface RecordMenuAction {
  /** Stable identity; defaults to the label. */
  id?: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Why a disabled item can't run now (short), shown beside it in the menu. */
  hint?: string;
  /** Items with the same group sit together; a separator falls between groups. */
  group?: string;
}

export function RecordActionsMenu({
  actions,
  label = "More actions",
  triggerLabel,
}: {
  actions: RecordMenuAction[];
  /** The trigger's accessible name. */
  label?: string;
  /** A page header's text trigger ("Actions" with a chevron); omitted: the "…" icon button. */
  triggerLabel?: string;
}) {
  if (actions.length === 0) return null;
  const entry = (a: RecordMenuAction, i: number): ItemMenuEntry => ({
    id: a.id ?? `${a.label}:${i}`,
    label: a.label,
    icon: a.icon,
    disabled: a.disabled,
    disabledReason: a.disabled ? a.hint : undefined,
    tone: a.destructive ? "destructive" : "default",
    onSelect: () => a.onPress?.(),
  });
  // Plain items keep their order, one section per group (a separator between groups); destructive last.
  const sections: ItemMenuSection[] = [];
  actions.forEach((a, i) => {
    if (a.destructive) return;
    const last = sections[sections.length - 1];
    const gid = `group:${a.group ?? ""}`;
    if (last && last.id === gid) last.items.push(entry(a, i));
    else sections.push({ id: gid, items: [entry(a, i)] });
  });
  const danger = actions.map((a, i) => (a.destructive ? entry(a, i) : null)).filter((e): e is ItemMenuEntry => e !== null);
  if (danger.length > 0) sections.push({ id: "danger", items: danger });
  return (
    <ItemMenu align="end" config={() => ({ sections })}>
      {triggerLabel ? (
        <Button type="button" variant="quiet" iconEnd={<ChevronDown aria-hidden="true" />}>
          {triggerLabel}
        </Button>
      ) : (
        <Button type="button" icon={<MoreHorizontal aria-hidden="true" />} variant="quiet" aria-label={label} />
      )}
    </ItemMenu>
  );
}
