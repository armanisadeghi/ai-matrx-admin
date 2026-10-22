// features/data-tables/pick-lists/pickListPageScope.ts
//
// Builds the `matrx-user/pick-lists` scope for a list's own page (/pick-lists/<id>) from what the page
// already holds in render state. Pure and fetch-free: the Surface Context window polls getScope. A
// list-derived key is OMITTED while the list is loading or failed to load (the page shows no rows
// then, so the agent sees none either); `list_load_state` / `list_load_error` say which.

import { xmlElement, xmlList, xmlText } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  createListsScope,
  type ListsItemEntry,
} from "@/features/surfaces/manifests/lists.manifest";
import { getListVisibility, type UserListWithItems } from "./types";
import { listAddress } from "./where-lists-live";

/** The most choices the up-front bundle carries; the rest stay in all_items. */
export const PICK_LIST_BUNDLE_MAX_ITEMS = 60;

export type PickListPageView = "choices" | "table";

export type PickListLoad =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; list: UserListWithItems };

/** Every choice as one flat row, in the order the page shows them. */
export function flattenPickListItems(list: UserListWithItems): ListsItemEntry[] {
  return Object.entries(list.items_grouped ?? {}).flatMap(([group, items]) =>
    items.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      help_text: item.help_text,
      group,
    })),
  );
}

/** The list as the agent reads it up front — one XML bundle. */
export function buildPickListBundle(list: UserListWithItems, items: ListsItemEntry[], isOwner: boolean): string {
  return xmlElement(
    "pick_list",
    {
      id: list.list_id,
      name: list.list_name,
      visibility: getListVisibility(list),
      choices: items.length,
      yours: isOwner,
    },
    [
      xmlText("description", list.description, { max: 1500 }),
      xmlList(
        "choices",
        items,
        (item) =>
          xmlElement(
            "choice",
            {
              id: item.id,
              label: item.label,
              group: item.group === "Ungrouped" ? null : item.group,
              hint: item.help_text,
            },
            item.description ? [xmlText("description", item.description, { max: 300 })] : [],
          ),
        { maxRows: PICK_LIST_BUNDLE_MAX_ITEMS },
      ),
    ],
  );
}

export function buildPickListPageScope(input: {
  listId: string;
  view: PickListPageView;
  load: PickListLoad;
  userId: string | null;
  focusedItemId: string | null;
}): SurfaceScopePayload {
  const { listId, view, load, userId, focusedItemId } = input;
  const base = {
    active_list_id: listId,
    active_list_url: listAddress(listId),
    list_view: view,
    list_load_state: load.state,
    ...(load.state === "error" ? { list_load_error: load.message } : {}),
  };
  if (load.state !== "ready") return createListsScope(base);

  const { list } = load;
  const items = flattenPickListItems(list);
  const groupNames = Object.keys(list.items_grouped ?? {});
  const isOwner = userId != null && list.user_id === userId;
  const focused = focusedItemId ? items.find((i) => i.id === focusedItemId) : undefined;
  return createListsScope({
    ...base,
    active_list_name: list.list_name,
    ...(list.description ? { active_list_description: list.description } : {}),
    active_list_item_count: items.length,
    active_list_group_count: groupNames.length,
    active_list_created_at: list.created_at,
    ...(list.updated_at ? { active_list_updated_at: list.updated_at } : {}),
    list_visibility: getListVisibility(list),
    list_is_owner: isOwner,
    all_items: items,
    items_grouped: list.items_grouped ?? {},
    list_group_names: groupNames,
    pick_list_bundle: buildPickListBundle(list, items, isOwner),
    ...(focused
      ? {
          selected_item_id: focused.id,
          selected_item_label: focused.label,
          ...(focused.description ? { selected_item_description: focused.description } : {}),
        }
      : {}),
  });
}
