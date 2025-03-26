"use client";

import React, { useState } from "react";
import {
  Avatar,
  Button,
  ScrollShadow,
  Listbox,
  ListboxItem,
  ListboxSection,
  Spacer,
  useDisclosure,
  cn,
  Input,
} from "@heroui/react";
import {Icon} from "@iconify/react";

import SidebarDrawer from "./sidebar-drawer";
import {usePathname} from "next/navigation";
import { ConversationRecordWithKey } from "@/types";
import { RecentPromptDropdown } from "./parts/RecentPromptDropdown";
import { getChatActions } from "@/lib/redux/entity/custom-actions/chatActions";
import { useAppDispatch } from "@/lib/redux";
import UserProfileDropdown from "@/components/layout/UserProfileDropdown";
import { LogoIcon } from "@/components/layout/MatrixLogo";
import FooterButtons from "./parts/FooterButtons";

export default function Component({
  children,
  header,
  title,
  subTitle,
  classNames = {},
  conversationHistory,
  onConversationSelection,
}: {
  children?: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subTitle?: string;
  classNames?: Record<string, string>;
  conversationHistory?: ConversationRecordWithKey[];
  onConversationSelection?: (conversationId: string) => void;
}) {
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const pathname = usePathname();
  const currentPath = pathname.split("/")?.[1];

  const dispatch = useAppDispatch();
  const chatActions = getChatActions(dispatch);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState<string>("");

  const handleDelete = (recordKey: string) => {
    console.log("Deleting conversation:", recordKey);
    chatActions.deleteConversation({
      matrxRecordId: recordKey,
    });
  };

  const handleShare = (recordKey: string) => {
    console.log("Sharing conversation:", recordKey);
    chatActions.directUpdateConversationIsPublic({
      matrxRecordId: recordKey,
      isPublic: true,
    });
  };

  const startEditing = (conversation: ConversationRecordWithKey) => {
    console.log("Starting edit for conversation:", conversation.id);
    setEditingConversationId(conversation.id);
    setEditLabel(conversation.label || ""); // Set initial value, no dispatch here
  };

  const saveEdit = (recordKey: string) => {
    if (editLabel.trim() && editLabel !== conversationHistory.find(c => c.matrxRecordId === recordKey)?.label) {
      console.log("Saving edit for:", recordKey, "with new label:", editLabel);
      chatActions.directUpdateConversationLabel({
        matrxRecordId: recordKey,
        label: editLabel,
      });
    } else {
      console.log("No changes or empty label, skipping save");
    }
    setEditingConversationId(null);
  };

  const content = (
    <div className="relative flex h-full w-72 flex-1 flex-col p-2 scrollbar-none">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full">
          <LogoIcon open={false} />
        </div>
        <span className="text-base font-bold uppercase leading-6 text-foreground">AI MATRX</span>
      </div>

      <Spacer y={8} />

      <div className="flex flex-col gap-4">
        <UserProfileDropdown />
      </div>

      <ScrollShadow className="-mr-6 h-full max-h-full pr-6">
        <Button
          fullWidth
          className="mb-6 mt-2 h-[44px] justify-start gap-3 bg-default-foreground px-3 py-[10px] text-default-50"
          startContent={
            <Icon className="text-default-50" icon="solar:chat-round-dots-linear" width={24} />
          }
        >
          New Chat
        </Button>

        <Listbox aria-label="Recent chats" variant="flat">
          <ListboxSection
            classNames={{
              base: "py-0",
              heading: "py-0 pl-[10px] text-small text-default-400",
            }}
            title="Recent"
          >
            {conversationHistory.map((conversation) => (
              <ListboxItem
                key={conversation.id}
                className="group h-[44px] px-[12px] py-[10px] text-default-500"
                onClick={() => onConversationSelection?.(conversation.matrxRecordId)}
                endContent={
                  <RecentPromptDropdown
                    recordKey={conversation.matrxRecordId}
                    onDelete={handleDelete}
                    onShare={handleShare}
                    onRename={() => startEditing(conversation)}
                  />
                }
              >
                {editingConversationId === conversation.id ? (
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => saveEdit(conversation.matrxRecordId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveEdit(conversation.matrxRecordId);
                      }
                      if (e.key === "Escape") {
                        setEditingConversationId(null);
                      }
                    }}
                    size="sm"
                    className="w-full"
                    autoFocus
                  />
                ) : (
                  conversation.label || "Unnamed Conversation"
                )}
              </ListboxItem>
            ))}
          </ListboxSection>
        </Listbox>
      </ScrollShadow>

      <Spacer y={8} />

      <FooterButtons />
    </div>
  );

  return (
    <div className="flex h-full min-h-[48rem] w-full py-4">
      <SidebarDrawer
        className="h-full flex-none rounded-[14px] bg-default-50"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        {content}
      </SidebarDrawer>
      <div className="flex w-full flex-col px-4 sm:max-w-[calc(100%_-_288px)]">
        <header
          className={cn(
            "flex h-16 min-h-16 items-center justify-between gap-2 rounded-none rounded-t-medium border-small border-divider px-4 py-3",
            classNames?.["header"],
          )}
        >
          <Button isIconOnly className="flex sm:hidden" size="sm" variant="light" onPress={onOpen}>
            <Icon
              className="text-default-500"
              height={24}
              icon="solar:hamburger-menu-outline"
              width={24}
            />
          </Button>
          {(title || subTitle) && (
            <div className="w-full min-w-[120px] sm:w-auto">
              <div className="truncate text-small font-semibold leading-5 text-foreground">
                {title}
              </div>
              <div className="truncate text-small font-normal leading-5 text-default-500">
                {subTitle}
              </div>
            </div>
          )}
          {header}
        </header>
        <main className="flex h-full">
          <div className="flex h-full w-full flex-col gap-4 rounded-none rounded-b-medium border-0 border-b border-l border-r border-divider py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}