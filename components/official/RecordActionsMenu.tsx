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
import { MoreHorizontal } from "lucide-react";
import { ItemMenu } from "@ai-matrx/design-system/item";
import type { ItemMenuEntry } from "@ai-matrx/design-system/item";
import { Button } from "@/components/ui/button";

export interface RecordMenuAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export function RecordActionsMenu({
  actions,
  label = "More actions",
}: {
  actions: RecordMenuAction[];
  /** The trigger's accessible name. */
  label?: string;
}) {
  if (actions.length === 0) return null;
  const entry = (a: RecordMenuAction): ItemMenuEntry => ({
    id: a.label,
    label: a.label,
    icon: a.icon,
    disabled: a.disabled,
    tone: a.destructive ? "destructive" : "default",
    onSelect: () => a.onPress?.(),
  });
  const plain = actions.filter((a) => !a.destructive).map(entry);
  const danger = actions.filter((a) => a.destructive).map(entry);
  return (
    <ItemMenu
      align="end"
      config={() => ({
        sections: [
          ...(plain.length > 0 ? [{ id: "actions", items: plain }] : []),
          ...(danger.length > 0 ? [{ id: "danger", items: danger }] : []),
        ],
      })}
    >
      <Button
        type="button"
        icon={<MoreHorizontal aria-hidden="true" />}
        variant="quiet"
        aria-label={label}
      />
    </ItemMenu>
  );
}
