"use client";

// ContextItemsBulk — checkboxes + the shared bulk bar for the context-items hub
// (/context-items, the organization and scope-type levels).
//
// The hub renders sections of rows, not a table, so selection lives here (a
// provider the hub wraps its content in) and the ACTIONS are the platform's
// shared `EntityBulkActions` — confirms, pending state, named refusals and
// toasts are the shared ones (precedent: NoteSidebarBulkBar).
//
// Move to Trash goes through the feature's own archive door (`deleteContextItem`
// → the context-item door, which `entity_soft_delete` routes to its own archive
// path) — never a plain `archiveRecord` deleted_at write. Whether a person may
// manage an item is per organization, so a row's checkbox is never hidden: an
// item the person cannot manage is skipped and named inside the action's `run`.

import { createContext, useContext, useState, type ReactNode } from "react";
import { FolderPen, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityBulkActions } from "@/lib/entity-list/components/EntityBulkBar";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import {
  bulkCountLabel,
  type EntityBulkAction,
  type EntityBulkSelection,
} from "@/lib/entity-list/selection";
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  deleteContextItem,
  updateContextItem,
} from "@/features/scopes/redux/contextItemCatalog";

/** What a ticked row remembers: enough to name it and to know if it may be changed. */
export interface SelectedContextItem {
  id: string;
  label: string;
  /** Whether the person may manage this item's organization. */
  canManage: boolean;
}

interface SelectionApi {
  isSelected: (id: string) => boolean;
  toggle: (item: SelectedContextItem) => void;
  /** Tick every given item, or untick them all when they are all ticked. */
  toggleMany: (items: SelectedContextItem[]) => void;
}

const SelectionContext = createContext<SelectionApi | null>(null);

/** The hub's selection, or null when a row is rendered outside a provider. */
export function useContextItemSelection(): SelectionApi | null {
  return useContext(SelectionContext);
}

const NOUN = "context item";
const NO_MANAGE = "You can't manage this organization's context items";

function buildActions(
  dispatch: ReturnType<typeof useAppDispatch>,
): EntityBulkAction<SelectedContextItem>[] {
  const rowIdOf = (row: SelectedContextItem) => row.id;
  const labelOf = (row: SelectedContextItem) => row.label;
  const skipReason = (row: SelectedContextItem) =>
    row.canManage ? null : NO_MANAGE;
  return [
    {
      id: "set-category",
      label: "Set category",
      icon: FolderPen,
      run: async (selection) => {
        const answers = await promptForValues({
          title: `Set category for ${bulkCountLabel(selection.count, NOUN)}`,
          description: "Replaces each item's current category.",
          submitLabel: "Set category",
          fields: [{ name: "category", prompt: "Category" }],
        });
        const category = answers?.category?.trim();
        // Cancelled or empty: resolve with nothing so the selection stays.
        if (!category) return;
        return runPerRow(
          selection,
          async (id) => {
            await dispatch(updateContextItem({ id, category })).unwrap();
          },
          { done: `Category set to "${category}"`, noun: NOUN, labelOf, skipReason },
          rowIdOf,
        );
      },
    },
    {
      id: "move-to-trash",
      label: "Move to Trash",
      icon: Trash2,
      variant: "destructive",
      confirm: (selection) => ({
        title: `Move ${bulkCountLabel(selection.count, NOUN)} to Trash?`,
        description:
          "Every scope of the item's type loses its value for it. Restore from Trash. Items you can't manage are skipped.",
        confirmLabel: "Move to Trash",
        variant: "destructive",
      }),
      run: (selection) =>
        runPerRow(
          selection,
          async (id) => {
            await dispatch(deleteContextItem(id)).unwrap();
          },
          { done: "Moved to Trash", noun: NOUN, labelOf, skipReason, removesRows: true },
          rowIdOf,
        ),
    },
  ];
}

export function ContextItemSelectionProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<Map<string, SelectedContextItem>>(
    () => new Map(),
  );

  const api: SelectionApi = {
    isSelected: (id) => selected.has(id),
    toggle: (item) =>
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.set(item.id, item);
        return next;
      }),
    toggleMany: (items) =>
      setSelected((prev) => {
        const next = new Map(prev);
        const all = items.every((item) => next.has(item.id));
        for (const item of items) {
          if (all) next.delete(item.id);
          else next.set(item.id, item);
        }
        return next;
      }),
  };

  const rows = [...selected.values()];
  const count = rows.length;
  const clear = () => setSelected(new Map());
  const build = (): EntityBulkSelection<SelectedContextItem> => ({
    mode: "ids",
    ids: rows.map((row) => row.id),
    rows,
    count,
    filter: {
      scope: { kind: "all" },
      orgId: null,
      search: "",
      deep: false,
      archived: "active",
      filters: {},
    },
  });

  return (
    <SelectionContext.Provider value={api}>
      <div
        className="flex min-h-9 flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-1"
        role="toolbar"
        aria-label="Bulk context item actions"
      >
        <span className="min-w-[6rem] text-xs font-medium tabular-nums text-foreground">
          {count > 0 ? `${count} selected` : "Tick items to act on them"}
        </span>
        <fieldset
          disabled={count === 0}
          className="m-0 flex min-w-0 flex-wrap items-center gap-1 border-0 p-0 disabled:opacity-50"
        >
          <EntityBulkActions
            actions={buildActions(dispatch)}
            selection={{ build, clear, count }}
            noun={NOUN}
            onRemoveRows={clear}
            onRefresh={() => {}}
          />
        </fieldset>
      </div>
      {children}
    </SelectionContext.Provider>
  );
}

/** The tick on one row. Never hidden: the action decides who it may change. */
export function ContextItemCheckbox({
  item,
}: {
  item: SelectedContextItem;
}) {
  const selection = useContextItemSelection();
  if (!selection) return null;
  return (
    <Checkbox
      checked={selection.isSelected(item.id)}
      onCheckedChange={() => selection.toggle(item)}
      aria-label={`Select ${item.label}`}
      className="mt-0.5 shrink-0"
    />
  );
}

/** The tick on a section header: all of its items, or none. */
export function ContextItemsSectionCheckbox({
  items,
  label,
}: {
  items: SelectedContextItem[];
  label: string;
}) {
  const selection = useContextItemSelection();
  if (!selection || items.length === 0) return null;
  const ticked = items.filter((item) => selection.isSelected(item.id)).length;
  return (
    <Checkbox
      checked={ticked === 0 ? false : ticked === items.length ? true : "indeterminate"}
      onCheckedChange={() => selection.toggleMany(items)}
      aria-label={`Select all ${label}`}
      className="shrink-0"
    />
  );
}
