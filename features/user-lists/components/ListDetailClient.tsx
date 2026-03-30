"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserListWithItems, GroupedItem } from "../types";
import { ListDetail } from "./ListDetail";
import { EditListDialog } from "./EditListDialog";
import { AddItemDialog } from "./AddItemDialog";
import { EditItemDialog } from "./EditItemDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { deleteListAction, deleteItemAction } from "../actions/list-actions";
import { useToastManager } from "@/hooks/useToastManager";

interface ListDetailClientProps {
  list: UserListWithItems;
  userId: string | null;
}

export function ListDetailClient({ list, userId }: ListDetailClientProps) {
  const router = useRouter();
  const toast = useToastManager("user-lists");
  const [, startTransition] = useTransition();

  const [editListOpen, setEditListOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemGroup, setAddItemGroup] = useState("");
  const [editItem, setEditItem] = useState<GroupedItem | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);

  const existingGroups = Object.keys(list.items_grouped ?? {}).filter(
    (g) => g !== "Ungrouped",
  );

  const handleAddItem = (groupName = "") => {
    setAddItemGroup(groupName);
    setAddItemOpen(true);
  };

  const handleEditItem = (item: GroupedItem) => {
    setEditItem(item);
    setEditItemOpen(true);
  };

  const handleDeleteItemRequest = (itemId: string) => {
    setDeleteItemId(itemId);
    setDeleteItemOpen(true);
  };

  const handleDeleteList = async () => {
    try {
      await deleteListAction(list.list_id);
      toast.success(`"${list.list_name}" deleted`);
      router.push("/lists");
    } catch (err) {
      toast.error(err);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    try {
      await deleteItemAction(deleteItemId, list.list_id);
      toast.success("Item deleted");
      setDeleteItemId(null);
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <>
      <ListDetail
        list={list}
        userId={userId}
        onEditList={() => setEditListOpen(true)}
        onDeleteList={() => setDeleteListOpen(true)}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItemRequest}
        onAddItem={handleAddItem}
      />

      <EditListDialog
        list={list}
        open={editListOpen}
        onOpenChange={setEditListOpen}
      />

      <AddItemDialog
        listId={list.list_id}
        defaultGroupName={addItemGroup}
        existingGroups={existingGroups}
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
      />

      <EditItemDialog
        item={editItem}
        listId={list.list_id}
        existingGroups={existingGroups}
        open={editItemOpen}
        onOpenChange={setEditItemOpen}
      />

      <DeleteConfirmDialog
        open={deleteListOpen}
        onOpenChange={setDeleteListOpen}
        title={`Delete "${list.list_name}"?`}
        description="This will permanently delete the list and all its items. This action cannot be undone."
        onConfirm={handleDeleteList}
      />

      <DeleteConfirmDialog
        open={deleteItemOpen}
        onOpenChange={setDeleteItemOpen}
        title="Delete item?"
        description="This item will be permanently removed from the list."
        onConfirm={handleDeleteItem}
      />
    </>
  );
}
