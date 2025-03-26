"use client";
import type {MessagingChatMessageProps} from "./data";

import React from "react";
import {cn} from "@heroui/react";

const MessagingChatMessage = React.forwardRef<HTMLDivElement, MessagingChatMessageProps>(
  ({role, content, isRTL, className, classNames, ...props}, ref) => {
    const messageRef = React.useRef<HTMLDivElement>(null);


    const Message = () => (
      <div className="flex max-w-[70%] flex-col gap-4">
        <div
          className={cn(
            "relative w-full rounded-medium bg-content2 px-4 py-3 text-default-600",
            classNames?.base,
          )}
        >
          <div ref={messageRef} className="mt-2 text-small text-default-900">
            <div className="whitespace-pre-line">{content}</div>
          </div>
        </div>
      </div>
    );

    return (
      <div
        {...props}
        ref={ref}
        className={cn("flex gap-3", {"flex-row-reverse": role === "user"}, className)}
      >
        <Message />
      </div>
    );
  },
);

MessagingChatMessage.displayName = "MessagingChatMessage";

export default MessagingChatMessage;
