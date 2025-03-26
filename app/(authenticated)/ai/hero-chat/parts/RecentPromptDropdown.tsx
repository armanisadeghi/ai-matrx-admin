"use client";

import React from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {Icon} from "@iconify/react";
import { MatrxRecordId } from "@/types";

export function RecentPromptDropdown({
  recordKey,
  onDelete,
  onShare,
  onRename,
}: {
  recordKey: MatrxRecordId;
  onDelete: (recordKey: string) => void;
  onShare: (recordKey: string) => void;
  onRename: () => void;
}) {
  return (
    <Dropdown>
      <DropdownTrigger>
        <Icon
          className="text-default-500 opacity-0 group-hover:opacity-100"
          icon="solar:menu-dots-bold"
          width={24}
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Dropdown menu with icons" className="py-2" variant="faded">
        <DropdownItem
          key="share"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon
              className="text-default-300"
              height={20}
              icon="solar:square-share-line-linear"
              width={20}
            />
          }
          onPress={() => {
            console.log("Share pressed for:", recordKey);
            onShare(recordKey);
          }}
        >
          Share
        </DropdownItem>
        <DropdownItem
          key="rename"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon className="text-default-300" height={20} icon="solar:pen-linear" width={20} />
          }
          onPress={() => {
            console.log("Rename pressed for:", recordKey);
            onRename();
          }}
        >
          Rename
        </DropdownItem>
        <DropdownItem
          key="archive"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon
              className="text-default-300"
              height={20}
              icon="solar:folder-open-linear"
              width={20}
            />
          }
        >
          Archive
        </DropdownItem>
        <DropdownItem
          key="delete"
          className="text-danger-500 data-[hover=true]:text-danger-500"
          color="danger"
          startContent={
            <Icon
              className="text-danger-500"
              height={20}
              icon="solar:trash-bin-minimalistic-linear"
              width={20}
            />
          }
          onPress={() => {
            console.log("Delete pressed for:", recordKey);
            onDelete(recordKey);
          }}
        >
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}