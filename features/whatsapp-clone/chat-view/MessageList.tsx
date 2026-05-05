"use client";

import { useEffect, useRef } from "react";
import { isSameDay } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/styles/themes/utils";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { formatDateSeparator } from "../shared/relative-time";
import type { WAMessage, WAUser } from "../types";

interface MessageListProps {
  messages: WAMessage[];
  participants: WAUser[];
  className?: string;
}

export function MessageList({
  messages,
  participants,
  className,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  const senderNameFor = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? "";

  let lastDate: Date | null = null;
  return (
    <ScrollArea className={cn("relative h-full w-full", className)}>
      <div className="flex flex-col gap-1.5 px-3 py-3">
        {messages.map((m) => {
          const d = new Date(m.createdAt);
          const showSep = !lastDate || !isSameDay(lastDate, d);
          lastDate = d;
          return (
            <div key={m.id} className="flex flex-col gap-1.5">
              {showSep ? (
                <DateSeparator label={formatDateSeparator(m.createdAt)} />
              ) : null}
              <MessageBubble
                message={m}
                senderName={senderNameFor(m.authorId)}
              />
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
