"use client";

// ContextItemsBulk — checkboxes + the shared bulk bar for the context-items hub
// (/context-items, the organization and scope-type levels).
//
// The hub renders sections of rows, not a table, so the ticks are the shared
// `useRowSelection` over the flattened on-screen items (a provider the hub wraps its
// content in), and the bar and ACTIONS are the platform's
// shared `EntityBulkActions` — confirms, pending state, named refusals and
// toasts are the shared ones (precedent: NoteSidebarBulkBar).
//
// Move to Trash goes through the feature's own archive door (`deleteContextItem`
// → the context-item door, which `entity_soft_delete` routes to its own archive
// path) — never a plain `archiveRecord` deleted_at write. Whether a person may
// manage an item is per organization, so a row's checkbox is never hidden: an
// item the person cannot manage is skipped and named inside the action's `run`.

import { createContext, useContext, type ReactNode } from "react";
import { FolderPen, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RowSelectionBar,
  useRowSelection,
} from "@/lib/entity-list/RowSelectionBar";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import { bulkCountLabel, type EntityBulkAction } from "@/lib/entity-list/selection";
import { promptForValues } from "@/components/dialogs/value-prompts/valuePromptsOpener";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  deleteContextItem,
  selectAllContextItems,
  updateContextItem,
} from "@/features/scopes/redux/contextItemCatalog";

/** One row the hub shows: enough to name it and to know if it may be changed. */
export interface SelectedContextItem {
  id: string;
  label: string;
  /** Whether the person may manage this item's organization. */
  canManage: boolean;
}

interface SelectionApi {
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Tick or untick a section's items (its header checkbox). */
  setMany: (ids: string[], ticked: boolean) => void;
}

const SelectionContext = createContext<SelectionApi | null>(null);

/** The hub's selection, or null when a row is rendered outside a provider. */
export function useContextItemSelection(): SelectionApi | null {
  return useContext(SelectionContext);
}

/** A scope type the hub is showing, and whether the person manages its organization. */
export interface ShownScopeType {
  id: string;
  canManage: boolean;
}

const NOUN = "context item";
const rowIdOf = (row: SelectedContextItem) => row.id;
const NO_MANAGE = "You can't manage this organization's context items";

function buildActions(
  dispatch: ReturnType<typeof useAppDispatch>,
): EntityBulkAction<SelectedContextItem>[] {
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
          "Saved values are kept and return on restore. Items you can't manage are skipped.",
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

export function ContextItemSelectionProvider({
  types,
  resetKey,
  children,
}: {
  /** The scope types on screen; only their items can be ticked. */
  types: readonly ShownScopeType[];
  /** Change it (organization, type) to clear the ticks. */
  resetKey: string;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const catalog = useAppSelector(selectAllContextItems);
  const manageByType = new Map(types.map((t) => [t.id, t.canManage]));
  const rows: SelectedContextItem[] = catalog
    .filter((item) => manageByType.has(item.scope_type_id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      canManage: manageByType.get(item.scope_type_id) === true,
    }));
  const selection = useRowSelection(rows, rowIdOf, resetKey);
  const api: SelectionApi = {
    has: selection.has,
    toggle: selection.toggle,
    setMany: selection.setMany,
  };

  return (
    <SelectionContext.Provider value={api}>
      <RowSelectionBar
        selection={selection}
        idOf={rowIdOf}
        actions={buildActions(dispatch)}
        noun={NOUN}
        plural="context items"
        disabled={rows.length === 0}
        onRefresh={() => {}}
        onRemoveRows={selection.clear}
      />
      {children}
    </SelectionContext.Provider>
  );
}

/** The tick on one row. Never hidden: the action decides who it may change. */
export function ContextItemCheckbox({ item }: { item: SelectedContextItem }) {
  const selection = useContextItemSelection();
  if (!selection) return null;
  return (
    <Checkbox
      checked={selection.has(item.id)}
      onCheckedChange={() => selection.toggle(item.id)}
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
  const ticked = items.filter((item) => selection.has(item.id)).length;
  return (
    <Checkbox
      checked={ticked === 0 ? false : ticked === items.length ? true : "indeterminate"}
      onCheckedChange={() =>
        selection.setMany(
          items.map((item) => item.id),
          ticked !== items.length,
        )
      }
      aria-label={`Select all ${label}`}
      className="shrink-0"
    />
  );
}
